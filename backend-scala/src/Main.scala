package nova

import com.sun.net.httpserver.{HttpExchange, HttpHandler, HttpServer}
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.sql.{Connection, DriverManager}
import java.util.concurrent.Executors
import org.mindrot.jbcrypt.BCrypt
import pdi.jwt.{Jwt, JwtAlgorithm}
import ujson.*

object Main:
  private val port = sys.env.getOrElse("PORT", "8082").toInt
  private val secret = sys.env.getOrElse("JWT_SECRET", "dev-cambia-esta-clave")
  private val dbServer = sys.env.getOrElse("DB_SERVER", ".\\MSSQLSERVER02")
  private val dbName = sys.env.getOrElse("DB_NAME", "TiendaRopa")
  private val jdbcHost = if dbServer.contains("\\") then dbServer.substring(0, dbServer.indexOf('\\')).replace(".", "localhost") else dbServer
  private val jdbcInstance = if dbServer.contains("\\") then s";instanceName=${dbServer.substring(dbServer.indexOf('\\') + 1)}" else ""
  private val jdbcUrl = s"jdbc:sqlserver://$jdbcHost$jdbcInstance;databaseName=$dbName;integratedSecurity=true;authenticationScheme=JavaKerberos;trustServerCertificate=true"

  def main(args: Array[String]): Unit =
    Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver")
    val server = HttpServer.create(InetSocketAddress(port), 0)
    server.createContext("/health", route(_ => json("""{"ok":true,"status":"scala backend running"}""")))
    server.createContext("/login", route(login))
    server.createContext("/categorias", route(categorias))
    server.createContext("/productos", route(productos))
    server.createContext("/carrito", route(carrito))
    server.createContext("/pedidos", route(pedidos))
    server.createContext("/productos/editar", route(editarProducto))
    server.setExecutor(Executors.newFixedThreadPool(8))
    server.start()
    println(s"Scala API escuchando en http://localhost:$port")

  private def route(handler: HttpExchange => Response): HttpHandler =
    exchange =>
      try
        if exchange.getRequestMethod == "OPTIONS" then
          exchange.getResponseHeaders.add("Access-Control-Allow-Origin", "*")
          exchange.getResponseHeaders.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
          exchange.getResponseHeaders.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
          exchange.sendResponseHeaders(204, -1)
          return
        val response =
          try handler(exchange)
          catch
            case error: Exception =>
              error.printStackTrace()
              json("""{"error":"Error interno del backend Scala"}""", 500)
        exchange.getResponseHeaders.add("Content-Type", "application/json; charset=utf-8")
        exchange.getResponseHeaders.add("Access-Control-Allow-Origin", "*")
        exchange.getResponseHeaders.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        exchange.getResponseHeaders.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        exchange.sendResponseHeaders(response.status, response.body.getBytes(StandardCharsets.UTF_8).length)
        exchange.getResponseBody.write(response.body.getBytes(StandardCharsets.UTF_8))
      finally exchange.close()

  private case class Response(status: Int, body: String)
  private def json(body: String, status: Int = 200) = Response(status, body)
  private def body(exchange: HttpExchange): String =
    new String(exchange.getRequestBody.readAllBytes(), StandardCharsets.UTF_8)
  private def connection: Connection = DriverManager.getConnection(jdbcUrl)
  private def pathSegments(exchange: HttpExchange): Array[String] =
    exchange.getRequestURI.getPath.stripPrefix("/").split("/").filter(_.nonEmpty)

  private def tableExists(conn: Connection, tableName: String): Boolean =
    val meta = conn.getMetaData
    val rs = meta.getTables(null, null, tableName, Array("TABLE"))
    try rs.next() finally rs.close()

  private def login(exchange: HttpExchange): Response =
    if exchange.getRequestMethod != "POST" then return json("""{"error":"Método no permitido"}""", 405)
    val input = ujson.read(body(exchange))
    val username = input("username").str.trim
    val password = input("password").str
    val statement = connection.prepareStatement("SELECT TOP 1 IdUsuario, Correo, Contrasena FROM usuarios WHERE Correo = ? AND Activo = 1")
    statement.setString(1, username)
    val result = statement.executeQuery()
    if !result.next() then json("""{"error":"Usuario o contraseña incorrectos"}""", 401)
    else
      val stored = result.getString("Contrasena")
      val valid = stored != null && (if stored.startsWith("$2") then BCrypt.checkpw(password, stored) else password == stored)
      if !valid then json("""{"error":"Usuario o contraseña incorrectos"}""", 401)
      else
        val token = Jwt.encode(s"""{"sub":${result.getInt("IdUsuario")},"username":"$username"}""", secret, JwtAlgorithm.HS256)
        json(ujson.Obj("token" -> token, "usuario" -> username).render())

  private def categorias(exchange: HttpExchange): Response =
    if exchange.getRequestMethod == "GET" then
      withConnection { conn =>
        val query = conn.createStatement().executeQuery(
          "SELECT IdCategoria id, Nombre nombre, Slug slug, Descripcion descripcion, Activo activo FROM categorias WHERE Activo = 1 ORDER BY Nombre"
        )
        val rows = Iterator.continually(query).takeWhile(_.next()).map { result =>
          ujson.Obj(
            "id" -> result.getInt("id"),
            "nombre" -> result.getString("nombre"),
            "slug" -> result.getString("slug"),
            "descripcion" -> Option(result.getString("descripcion")).getOrElse(""),
            "activo" -> result.getBoolean("activo")
          )
        }.toSeq
        json(Arr.from(rows).render())
      }
    else json("""{"error":"Método no permitido"}""", 405)

  private def productos(exchange: HttpExchange): Response =
    val parts = pathSegments(exchange)

    if exchange.getRequestMethod == "GET" then
      if parts.length == 2 && parts(0) == "productos" && parts(1).forall(_.isDigit) then
        val productId = parts(1).toInt
        withConnection { conn =>
          val productQuery = conn.prepareStatement(
            "SELECT p.IdProducto id, p.Nombre nombre, p.Descripcion descripcion, p.Imagen imagen, p.Activo activo, c.Nombre categoria, v.IdVariante varianteId, v.Talla talla, v.Color color, v.Stock stock, v.Precio precio, v.CodigoSKU sku FROM productos p LEFT JOIN categorias c ON c.IdCategoria = p.IdCategoria LEFT JOIN producto_variantes v ON v.IdProducto = p.IdProducto WHERE p.IdProducto = ? ORDER BY v.IdVariante"
          )
          productQuery.setInt(1, productId)
          val rows = productQuery.executeQuery()
          if !rows.next() then return json("""{"error":"Producto no encontrado"}""", 404)
          val base = ujson.Obj(
            "id" -> rows.getInt("id"),
            "nombre" -> rows.getString("nombre"),
            "descripcion" -> Option(rows.getString("descripcion")).getOrElse(""),
            "imagen" -> Option(rows.getString("imagen")).getOrElse(""),
            "activo" -> rows.getBoolean("activo"),
            "categoria" -> Option(rows.getString("categoria")).getOrElse("Novedades")
          )
          val variants = scala.collection.mutable.ArrayBuffer.empty[ujson.Value]
          do
            variants += ujson.Obj(
              "id" -> rows.getInt("varianteId"),
              "talla" -> rows.getString("talla"),
              "color" -> rows.getString("color"),
              "stock" -> rows.getInt("stock"),
              "precio" -> rows.getBigDecimal("precio").doubleValue,
              "sku" -> rows.getString("sku")
            )
          while rows.next()
          val images = if tableExists(conn, "ProductoImagenes") then
            val imageQuery = conn.prepareStatement("SELECT Url url, TextoAlternativo alt, Orden orden FROM ProductoImagenes WHERE IdProducto = ? AND Activo = 1 ORDER BY Orden, IdImagen")
            imageQuery.setInt(1, productId)
            val imageRows = imageQuery.executeQuery()
            Iterator.continually(imageRows).takeWhile(_.next()).map { image =>
              ujson.Obj("url" -> image.getString("url"), "alt" -> Option(image.getString("alt")).getOrElse(""), "orden" -> image.getInt("orden"))
            }.toSeq
          else Seq.empty
          json(ujson.Obj(base.value ++ Map("variantes" -> Arr.from(variants), "imagenes" -> Arr.from(images))).render())
        }
      else
        withConnection { connection =>
          val query = connection.createStatement().executeQuery(
            """SELECT p.IdProducto id,p.Nombre nombre,p.Genero genero,COALESCE(v.Precio,0) precio,COALESCE(v.Stock,0) stock,
              |COALESCE(c.Nombre,'Novedades') categoria,COALESCE(v.CodigoSKU,CONCAT('NOVA-',p.IdProducto)) sku,
              |COALESCE(v.Talla,'Única') talla,COALESCE(v.Color,'Negro') color,
              |COALESCE(p.Imagen,'') imagen,p.Activo activo
              |FROM productos p LEFT JOIN categorias c ON c.IdCategoria=p.IdCategoria
              |OUTER APPLY (SELECT TOP 1 * FROM producto_variantes pv WHERE pv.IdProducto=p.IdProducto AND pv.Activo=1 ORDER BY pv.IdVariante) v
              |ORDER BY p.IdProducto""".stripMargin)
          val rows = Iterator.continually(query).takeWhile(_.next()).map { result =>
            ujson.Obj("id" -> result.getInt("id"), "nombre" -> result.getString("nombre"), "genero" -> result.getString("genero"),
              "precio" -> result.getBigDecimal("precio").doubleValue, "stock" -> result.getInt("stock"),
              "categoria" -> result.getString("categoria"), "sku" -> result.getString("sku"),
              "talla" -> result.getString("talla"), "color" -> result.getString("color"),
              "imagen" -> result.getString("imagen"), "activo" -> result.getBoolean("activo"))
          }.toSeq
          json(Arr.from(rows).render())
        }
    else if exchange.getRequestMethod == "POST" then
      val input = ujson.read(body(exchange))
      withConnection { connection =>
        if !tableExists(connection, "categorias") then return json("""{"error":"Migración de categorías no aplicada"}""", 503)
        val category = connection.prepareStatement("SELECT TOP 1 IdCategoria FROM categorias WHERE Nombre = ? AND Activo = 1")
        category.setString(1, input("categoria").str)
        val categoryResult = category.executeQuery()
        val categoryId = if categoryResult.next() then categoryResult.getInt(1) else 1
        val product = connection.prepareStatement(
          "INSERT INTO productos (IdCategoria,Nombre,Slug,Descripcion,Genero,Marca,Imagen,Activo) OUTPUT INSERTED.IdProducto VALUES (?,?,?,?,?,?,?,1)")
        product.setInt(1, categoryId)
        product.setString(2, input("nombre").str)
        product.setString(3, input("nombre").str.toLowerCase.replace(" ", "-"))
        product.setString(4, input("nombre").str)
        product.setString(5, "unisex")
        product.setString(6, "NOVA")
        product.setString(7, input("imagen").str)
        val inserted = product.executeQuery()
        inserted.next()
        val id = inserted.getInt(1)
        val variant = connection.prepareStatement("INSERT INTO producto_variantes (IdProducto,Talla,Color,Stock,Precio,CodigoSKU,Activo) VALUES (?,?,?,?,?,?,1)")
        variant.setInt(1, id)
        variant.setString(2, input("talla").str)
        variant.setString(3, input("color").str)
        variant.setInt(4, input("stock").num.toInt)
        variant.setBigDecimal(5, java.math.BigDecimal.valueOf(input("precio").num))
        variant.setString(6, input("sku").str)
        variant.executeUpdate()
        json(input.render(), 201)
      }
    else if exchange.getRequestMethod == "DELETE" then
      val id = exchange.getRequestURI.getPath.split("/").last.toInt
      withConnection { connection =>
        val statement = connection.prepareStatement("UPDATE productos SET Activo=0 WHERE IdProducto=?")
        statement.setInt(1, id)
        statement.executeUpdate()
        json(s"""{"ok":true,"id":$id}""")
      }
    else json("""{"error":"Método no permitido"}""", 405)

  private def editarProducto(exchange: HttpExchange): Response =
    if exchange.getRequestMethod != "POST" then return json("""{"error":"Método no permitido"}""", 405)
    val input = ujson.read(body(exchange))
    withConnection { connection =>
      val statement = connection.prepareStatement("UPDATE productos SET Nombre=?, Imagen=? WHERE IdProducto=?")
      statement.setString(1, input("nombre").str)
      statement.setString(2, input("imagen").str)
      statement.setInt(3, input("id").num.toInt)
      statement.executeUpdate()
      json(input.render())
    }

  private def carrito(exchange: HttpExchange): Response =
    val parts = pathSegments(exchange)

    if exchange.getRequestMethod == "GET" then
      val usuarioId = if parts.nonEmpty then parts.last.toInt else 0
      withConnection { conn =>
        if !tableExists(conn, "carrito") then return json("""{"error":"Migración de carrito no aplicada"}""", 503)
        val query = conn.prepareStatement(
          "SELECT c.IdCarrito id, c.IdUsuario usuarioId, c.IdVariante varianteId, c.Cantidad cantidad, c.PrecioUnitario precioUnitario, v.Talla talla, v.Color color, p.Nombre nombre, p.Imagen imagen FROM carrito c JOIN producto_variantes v ON v.IdVariante = c.IdVariante JOIN productos p ON p.IdProducto = v.IdProducto WHERE c.IdUsuario = ? ORDER BY c.IdCarrito DESC"
        )
        query.setInt(1, usuarioId)
        val rs = query.executeQuery()
        val rows = Iterator.continually(rs).takeWhile(_.next()).map { result =>
          ujson.Obj(
            "id" -> result.getInt("id"),
            "usuarioId" -> result.getInt("usuarioId"),
            "varianteId" -> result.getInt("varianteId"),
            "cantidad" -> result.getInt("cantidad"),
            "precioUnitario" -> result.getBigDecimal("precioUnitario").doubleValue,
            "talla" -> result.getString("talla"),
            "color" -> result.getString("color"),
            "nombre" -> result.getString("nombre"),
            "imagen" -> result.getString("imagen")
          )
        }.toSeq
        json(Arr.from(rows).render())
      }
    else if exchange.getRequestMethod == "POST" then
      val input = ujson.read(body(exchange))
      withConnection { conn =>
        if !tableExists(conn, "carrito") then return json("""{"error":"Migración de carrito no aplicada"}""", 503)
        val usuarioId = input("usuarioId").num.toInt
        val varianteId = input("varianteId").num.toInt
        val cantidad = input("cantidad").num.toInt

        val stockStmt = conn.prepareStatement("SELECT Stock, Precio FROM producto_variantes WHERE IdVariante = ? AND Activo = 1")
        stockStmt.setInt(1, varianteId)
        val stockRs = stockStmt.executeQuery()
        if !stockRs.next() then return json("""{"error":"Variante no encontrada"}""", 404)
        val stockActual = stockRs.getInt("Stock")
        if cantidad > stockActual then return json("""{"error":"La cantidad supera el stock disponible"}""", 409)

        val existing = conn.prepareStatement("SELECT IdCarrito, Cantidad FROM carrito WHERE IdUsuario = ? AND IdVariante = ?")
        existing.setInt(1, usuarioId)
        existing.setInt(2, varianteId)
        val existingRs = existing.executeQuery()
        if existingRs.next() then
          val id = existingRs.getInt("IdCarrito")
          val nuevaCantidad = existingRs.getInt("Cantidad") + cantidad
          if nuevaCantidad > stockActual then return json("""{"error":"La cantidad total supera el stock disponible"}""", 409)
          val update = conn.prepareStatement("UPDATE carrito SET Cantidad = ?, PrecioUnitario = ? WHERE IdCarrito = ?")
          update.setInt(1, nuevaCantidad)
          update.setBigDecimal(2, stockRs.getBigDecimal("Precio"))
          update.setInt(3, id)
          update.executeUpdate()
          json(s"""{"ok":true,"id":$id,"cantidad":$nuevaCantidad}""")
        else
          val insert = conn.prepareStatement("INSERT INTO carrito (IdUsuario, IdVariante, Cantidad, PrecioUnitario) VALUES (?, ?, ?, ?)")
          insert.setInt(1, usuarioId)
          insert.setInt(2, varianteId)
          insert.setInt(3, cantidad)
          insert.setBigDecimal(4, stockRs.getBigDecimal("Precio"))
          insert.executeUpdate()
          json("""{"ok":true,"mensaje":"Producto agregado al carrito"}""")
      }
    else if exchange.getRequestMethod == "PUT" then
      val input = ujson.read(body(exchange))
      withConnection { conn =>
        if !tableExists(conn, "carrito") then return json("""{"error":"Migración de carrito no aplicada"}""", 503)
        val idCarrito = input("id").num.toInt
        val cantidad = input("cantidad").num.toInt
        val stmt = conn.prepareStatement("SELECT c.IdVariante, v.Stock FROM carrito c JOIN producto_variantes v ON v.IdVariante = c.IdVariante WHERE c.IdCarrito = ?")
        stmt.setInt(1, idCarrito)
        val rs = stmt.executeQuery()
        if !rs.next() then return json("""{"error":"Carrito no encontrado"}""", 404)
        if cantidad > rs.getInt("Stock") then return json("""{"error":"La cantidad supera el stock disponible"}""", 409)
        val update = conn.prepareStatement("UPDATE carrito SET Cantidad = ? WHERE IdCarrito = ?")
        update.setInt(1, cantidad)
        update.setInt(2, idCarrito)
        update.executeUpdate()
        json("""{"ok":true,"mensaje":"Cantidad actualizada"}""")
      }
    else if exchange.getRequestMethod == "DELETE" then
      val idCarrito = if parts.nonEmpty then parts.last.toInt else 0
      withConnection { conn =>
        if !tableExists(conn, "carrito") then return json("""{"error":"Migración de carrito no aplicada"}""", 503)
        val stmt = conn.prepareStatement("DELETE FROM carrito WHERE IdCarrito = ?")
        stmt.setInt(1, idCarrito)
        stmt.executeUpdate()
        json(s"""{"ok":true,"id":$idCarrito}""")
      }
    else json("""{"error":"Método no permitido"}""", 405)

  private def pedidos(exchange: HttpExchange): Response =
    val parts = pathSegments(exchange)

    if exchange.getRequestMethod == "GET" then
      val usuarioId = if parts.nonEmpty then parts.last.toInt else 0
      withConnection { conn =>
        if !tableExists(conn, "pedidos") then return json("""{"error":"Migración de pedidos no aplicada"}""", 503)
        val query = conn.prepareStatement(
          "SELECT p.IdPedido id, p.IdUsuario usuarioId, p.Estado estado, p.Subtotal subtotal, p.Total total, p.FechaPedido fechaPedido FROM pedidos p WHERE p.IdUsuario = ? ORDER BY p.FechaPedido DESC"
        )
        query.setInt(1, usuarioId)
        val rs = query.executeQuery()
        val rows = Iterator.continually(rs).takeWhile(_.next()).map { result =>
          ujson.Obj(
            "id" -> result.getInt("id"),
            "usuarioId" -> result.getInt("usuarioId"),
            "estado" -> result.getString("estado"),
            "subtotal" -> result.getBigDecimal("subtotal").doubleValue,
            "total" -> result.getBigDecimal("total").doubleValue,
            "fechaPedido" -> result.getTimestamp("fechaPedido").toInstant.toString
          )
        }.toSeq
        json(Arr.from(rows).render())
      }
    else if exchange.getRequestMethod == "POST" then
      val input = ujson.read(body(exchange))
      withConnection { conn =>
        if !tableExists(conn, "carrito") || !tableExists(conn, "pedidos") || !tableExists(conn, "pedido_detalle") then
          return json("""{"error":"Migración de ecommerce no aplicada"}""", 503)
        val usuarioId = input("usuarioId").num.toInt
        val direccion = input("direccion").str
        val items = input("items").arr
        if items.isEmpty then return json("""{"error":"El pedido requiere al menos un producto"}""", 400)

        var subtotal = 0.0
        val detalles = scala.collection.mutable.ArrayBuffer.empty[(Int, Int, BigDecimal, Int)]
        items.foreach { item =>
          val variantId = item("varianteId").num.toInt
          val cantidad = item("cantidad").num.toInt
          val stockStmt = conn.prepareStatement("SELECT Stock, Precio FROM producto_variantes WHERE IdVariante = ? AND Activo = 1")
          stockStmt.setInt(1, variantId)
          val stockRs = stockStmt.executeQuery()
          if !stockRs.next() then throw new RuntimeException(s"Variante $variantId no encontrada")
          val stockActual = stockRs.getInt("Stock")
          if cantidad > stockActual then throw new RuntimeException(s"Stock insuficiente para la variante $variantId")
          val precio = stockRs.getBigDecimal("Precio")
          subtotal += precio.doubleValue * cantidad
          detalles += ((variantId, cantidad, precio, 0))
        }

        val total = subtotal
        val pedido = conn.prepareStatement("INSERT INTO pedidos (IdUsuario, Estado, Subtotal, Total, Moneda, DireccionEnvio) OUTPUT INSERTED.IdPedido VALUES (?, 'pendiente', ?, ?, 'PEN', ?)")
        pedido.setInt(1, usuarioId)
        pedido.setBigDecimal(2, java.math.BigDecimal.valueOf(subtotal))
        pedido.setBigDecimal(3, java.math.BigDecimal.valueOf(total))
        pedido.setString(4, direccion)
        val pedidoRs = pedido.executeQuery()
        val pedidoId = if pedidoRs.next() then pedidoRs.getInt(1) else 0

        val detalleStmt = conn.prepareStatement("INSERT INTO pedido_detalle (IdPedido, IdVariante, Cantidad, PrecioUnitario, Subtotal) VALUES (?, ?, ?, ?, ?)")
        detalles.foreach { case (varianteId, cantidad, precio, _) =>
          val sub = precio.multiply(java.math.BigDecimal.valueOf(cantidad.toDouble))
          detalleStmt.setInt(1, pedidoId)
          detalleStmt.setInt(2, varianteId)
          detalleStmt.setInt(3, cantidad)
          detalleStmt.setBigDecimal(4, precio)
          detalleStmt.setBigDecimal(5, sub)
          detalleStmt.executeUpdate()

          val updateStock = conn.prepareStatement("UPDATE producto_variantes SET Stock = Stock - ? WHERE IdVariante = ?")
          updateStock.setInt(1, cantidad)
          updateStock.setInt(2, varianteId)
          updateStock.executeUpdate()
        }

        json(ujson.Obj("ok" -> true, "pedidoId" -> pedidoId, "total" -> total).render())
      }
    else json("""{"error":"Método no permitido"}""", 405)

  private def withConnection(handler: Connection => Response): Response =
    val db = connection
    try handler(db) finally db.close()