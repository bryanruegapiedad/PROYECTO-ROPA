package nova

import com.sun.net.httpserver.{HttpExchange, HttpHandler, HttpServer}
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.nio.file.Paths
import java.sql.{Connection, DriverManager, ResultSet}
import java.util.Base64
import java.util.concurrent.Executors
import org.mindrot.jbcrypt.BCrypt
import pdi.jwt.{Jwt, JwtAlgorithm}
import ujson.*

object Main:
  private val port = sys.env.getOrElse("PORT", "8082").toInt
  private val secret =
    sys.env.getOrElse("JWT_SECRET", "dev-cambia-esta-clave")
  private val dbServer =
    sys.env.getOrElse("DB_SERVER", ".\\MSSQLSERVER02")
  private val dbName =
    sys.env.getOrElse("DB_NAME", "TiendaRopa")

  private val jwtAlgorithms =
    scala.collection.immutable.Seq(JwtAlgorithm.HS256)

  private val jdbcHost =
    if dbServer.contains("\\") then
      dbServer
        .substring(0, dbServer.indexOf('\\'))
        .replace(".", "localhost")
    else dbServer

  private val jdbcInstance =
    if dbServer.contains("\\") then
      s";instanceName=${dbServer.substring(dbServer.indexOf('\\') + 1)}"
    else ""

  private val jdbcUrl =
    s"jdbc:sqlserver://$jdbcHost$jdbcInstance;databaseName=$dbName;integratedSecurity=true;authenticationScheme=NativeAuthentication;trustServerCertificate=true"

  private case class Response(status: Int, body: String)

  private case class AuthenticatedUser(id: Int, username: String)

  def main(args: Array[String]): Unit =

    Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver")
    ensureUsernameColumn()

    if secret == "dev-cambia-esta-clave" then
      println(
        "[ADVERTENCIA] JWT_SECRET no está configurado. " +
          "Usando clave de desarrollo."
      )

    val server = HttpServer.create(InetSocketAddress(port), 0)

    server.createContext(
      "/health",
      route(_ => json("""{"ok":true,"status":"scala backend running"}"""))
    )
    server.createContext("/login", route(login))
    server.createContext("/registro", route(registro))
    server.createContext("/categorias", route(categorias))
    server.createContext("/productos", route(productos))
    server.createContext("/recomendaciones", route(recomendaciones))
    server.createContext("/carrito", route(carrito))
    server.createContext("/pedidos", route(pedidos))
    server.createContext("/productos/editar", route(editarProducto))

    server.setExecutor(Executors.newFixedThreadPool(8))
    server.start()

    println(s"Scala API escuchando en http://localhost:$port")

  private def route(handler: HttpExchange => Response): HttpHandler =
    exchange =>
      try
        val response =
          if exchange.getRequestMethod == "OPTIONS" then
            Response(204, "")
          else
            try
              handler(exchange)
            catch
              case error: Exception =>
                error.printStackTrace()
                json("""{"error":"Error interno del backend Scala"}""", 500)

        exchange.getResponseHeaders.add(
          "Content-Type",
          "application/json; charset=utf-8"
        )
        exchange.getResponseHeaders.add(
          "Access-Control-Allow-Origin",
          "*"
        )
        exchange.getResponseHeaders.add(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS"
        )
        exchange.getResponseHeaders.add(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        )

        if response.status == 204 then
          exchange.sendResponseHeaders(204, -1)
        else
          val responseBytes =
            response.body.getBytes(StandardCharsets.UTF_8)

          exchange.sendResponseHeaders(
            response.status,
            responseBytes.length
          )

          exchange.getResponseBody.write(responseBytes)
      finally
        exchange.close()

  private def json(body: String, status: Int = 200): Response =
    Response(status, body)

  private def body(exchange: HttpExchange): String =
    new String(
      exchange.getRequestBody.readAllBytes(),
      StandardCharsets.UTF_8
    )

  private def connection: Connection =
    DriverManager.getConnection(jdbcUrl)

  private def withConnection(
      handler: Connection => Response
  ): Response =
    val db = connection
    try
      handler(db)
    finally
      db.close()

  private def ensureUsernameColumn(): Unit =
    withConnection { conn =>
      val statement = conn.createStatement()
      try
        statement.execute(
          "IF COL_LENGTH('dbo.usuarios', 'Usuario') IS NULL " +
            "ALTER TABLE dbo.usuarios ADD Usuario VARCHAR(100) NULL"
        )
        statement.execute(
          "IF NOT EXISTS (SELECT 1 FROM sys.indexes " +
            "WHERE object_id = OBJECT_ID('dbo.usuarios') " +
            "AND name = 'UX_usuarios_Usuario') " +
            "CREATE UNIQUE INDEX UX_usuarios_Usuario " +
            "ON dbo.usuarios(Usuario) WHERE Usuario IS NOT NULL"
        )
        json("{\"ok\":true}")
      finally
        statement.close()
    }

  private def pathSegments(
      exchange: HttpExchange
  ): Array[String] =
    exchange.getRequestURI.getPath
      .stripPrefix("/")
      .split("/")
      .filter(_.nonEmpty)

  private def tableExists(
      conn: Connection,
      tableName: String
  ): Boolean =
    val meta = conn.getMetaData
    val rs = meta.getTables(
      null,
      null,
      tableName,
      Array("TABLE")
    )

    try
      rs.next()
    finally
      rs.close()

  private def createToken(
      userId: Int,
      username: String
  ): String =
    val now = System.currentTimeMillis() / 1000
    val expiration = now + (8 * 60 * 60)

    val claims =
      ujson.Obj(
        "sub" -> userId,
        "username" -> username,
        "iat" -> now,
        "exp" -> expiration
      )

    Jwt.encode(
      claims.render(),
      secret,
      JwtAlgorithm.HS256
    )

  private def authenticate(
      exchange: HttpExchange
  ): Option[AuthenticatedUser] =
    val authorization =
      Option(
        exchange.getRequestHeaders.getFirst("Authorization")
      ).getOrElse("")

    if !authorization.startsWith("Bearer ") then
      None
    else
      val token =
        authorization.stripPrefix("Bearer ").trim

      if token.isEmpty then
        None
      else
        try
          Jwt
            .decode(
              token,
              secret,
              jwtAlgorithms
            )
            .toOption
            .flatMap { claim =>
              val payload = ujson.read(claim.content)

              val userId =
                payload.obj
                  .get("sub")
                  .map(_.num.toInt)

              val username =
                payload.obj
                  .get("username")
                  .map(_.str)

              for
                id <- userId
                user <- username
              yield AuthenticatedUser(id, user)
            }
        catch
          case _: Exception =>
            None

  private val prologPath =
    Paths.get("..", "prolog", "recomendaciones.pl")
      .toAbsolutePath
      .normalize()

  private def unauthorized: Response =
    json("""{"error":"No autorizado"}""", 401)

  private def sanitizePrologValue(value: String): String =
    val normalized = value.trim
    if normalized.isEmpty then "general" else normalized.replace("'", "''")

  private def realProductPhotoUrl(productName: String, color: String = ""): String =
    val nameKey = normalizarClaveTexto(productName)
    val colorKey = normalizarClaveTexto(color)

    val poloPhotos = Map(
      "negro" -> "assets/images/products/polos/polo-basico-negro.png",
      "azul" -> "assets/images/products/polos/polo-basico-azul.png",
      "rojo" -> "assets/images/products/polos/polo-basico-rojo.png",
      "blanco" -> "assets/images/products/polos/polo-basico-blanco.png",
      "gris" -> "assets/images/products/polos/polo-basico-negro.png"
    )

    val pantalonPhotos = Map(
      "azul" -> "assets/images/products/pantalones/jean-clasico-azul.png",
      "negro" -> "assets/images/products/pantalones/jean-clasico-negro.png",
      "beige" -> "assets/images/products/pantalones/jean-clasico-beige.png",
      "gris" -> "assets/images/products/pantalones/jean-clasico-gris.png"
    )

    val vestidoPhotos = Map(
      "rojo" -> "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
      "azul" -> "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
      "negro" -> "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
    )

    val blusaPhotos = Map(
      "blanco" -> "assets/images/products/blusas/blusa-blanca.png",
      "azul" -> "assets/images/products/blusas/blusa-azul.png",
      "rosa" -> "assets/images/products/blusas/blusa-rosa.png"
    )

    val poleraPhotos = Map(
      "negro" -> "assets/images/products/poleras/polera-basica-negra.png",
      "gris" -> "assets/images/products/poleras/polera-basica-gris.png"
    )

    val zapatoPhotos = Map(
      "blanco" -> "assets/images/products/zapatos/zapatilla-casual-blanca.png",
      "negro" -> "assets/images/products/zapatos/zapatilla-casual-negra.png",
      "rosa" -> "assets/images/products/zapatos/zapatilla-casual-rosa.png",
      "azul" -> "assets/images/products/zapatos/zapatilla-casual-azul.png",
      "rojo" -> "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=80"
    )

    if nameKey.contains("polo") then
      poloPhotos.getOrElse(colorKey, poloPhotos("negro"))
    else if nameKey.contains("jean") || nameKey.contains("pantalon") then
      pantalonPhotos.getOrElse(colorKey, "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80")
    else if nameKey.contains("vestido") then
      vestidoPhotos.getOrElse(colorKey, "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80")
    else if nameKey.contains("blusa") || nameKey.contains("camisa") then
      blusaPhotos.getOrElse(colorKey, "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80")
    else if nameKey.contains("polera") then
      poleraPhotos.getOrElse(colorKey, "assets/images/products/poleras/polera-basica-negra.png")
    else if nameKey.contains("zapato") || nameKey.contains("zapatilla") then
      zapatoPhotos.getOrElse(colorKey, "assets/images/products/zapatos/zapatilla-casual-blanca.png")
    else
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80"

  private val catalogoImagenesProductos: Map[String, String] =
    Map(
      "polo basico algodon" -> realProductPhotoUrl("Polo Básico Algodón", "Negro"),
      "polo oversize" -> realProductPhotoUrl("Polo Oversize", "Negro"),
      "jean clasico" -> realProductPhotoUrl("Jean Clásico", "Azul"),
      "pantalon casual" -> realProductPhotoUrl("Pantalón Casual", "Azul"),
      "vestido casual" -> realProductPhotoUrl("Vestido Casual", "Rojo"),
      "vestido elegante" -> realProductPhotoUrl("Vestido Elegante", "Negro"),
      "zapato casual" -> realProductPhotoUrl("Zapato Casual", "Rojo"),
      "zapatillas" -> realProductPhotoUrl("Zapatillas", "Blanco"),
      "zapatilla casual" -> realProductPhotoUrl("Zapatilla Casual", "Blanco"),
      "blusa basica" -> realProductPhotoUrl("Blusa Básica", "Azul"),
      "blusa elegante" -> realProductPhotoUrl("Blusa Elegante", "Blanco"),
      "camisa formal" -> realProductPhotoUrl("Camisa Formal", "Blanco"),
      "polera basica" -> realProductPhotoUrl("Polera Básica", "Negro"),
      "casaca denim" -> realProductPhotoUrl("Casaca Denim", "Azul"),
      "polera con capucha" -> realProductPhotoUrl("Polera con Capucha", "Gris"),
      "zapatilla urbana" -> realProductPhotoUrl("Zapatilla Urbana", "Blanco")
    )

  private val catalogoImagenesPorColor: Map[(String, String), String] =
    Map(
      ("polo basico algodon", "negro") -> realProductPhotoUrl("Polo Básico Algodón", "Negro"),
      ("polo basico algodon", "azul") -> realProductPhotoUrl("Polo Básico Algodón", "Azul"),
      ("polo basico algodon", "blanco") -> realProductPhotoUrl("Polo Básico Algodón", "Blanco"),
      ("polo basico algodon", "rojo") -> realProductPhotoUrl("Polo Básico Algodón", "Rojo"),
      ("polo oversize", "negro") -> realProductPhotoUrl("Polo Oversize", "Negro"),
      ("polo oversize", "azul") -> realProductPhotoUrl("Polo Oversize", "Azul"),
      ("polo oversize", "blanco") -> realProductPhotoUrl("Polo Oversize", "Blanco"),
      ("polo oversize", "rojo") -> realProductPhotoUrl("Polo Oversize", "Rojo"),
      ("jean clasico", "azul") -> realProductPhotoUrl("Jean Clásico", "Azul"),
      ("jean clasico", "negro") -> realProductPhotoUrl("Jean Clásico", "Negro"),
      ("jean clasico", "beige") -> realProductPhotoUrl("Jean Clásico", "Beige"),
      ("jean clasico", "gris") -> realProductPhotoUrl("Jean Clásico", "Gris"),
      ("vestido casual", "rojo") -> realProductPhotoUrl("Vestido Casual", "Rojo"),
      ("vestido casual", "azul") -> realProductPhotoUrl("Vestido Casual", "Azul"),
      ("zapatilla casual", "blanco") -> realProductPhotoUrl("Zapatilla Casual", "Blanco"),
      ("zapatilla casual", "negro") -> realProductPhotoUrl("Zapatilla Casual", "Negro"),
      ("zapatilla casual", "rosa") -> realProductPhotoUrl("Zapatilla Casual", "Rosa"),
      ("zapatilla casual", "azul") -> realProductPhotoUrl("Zapatilla Casual", "Azul"),
      ("blusa basica", "azul") -> realProductPhotoUrl("Blusa Básica", "Azul"),
      ("blusa basica", "blanco") -> realProductPhotoUrl("Blusa Básica", "Blanco"),
      ("blusa basica", "rosa") -> realProductPhotoUrl("Blusa Básica", "Rosa"),
      ("camisa formal", "blanco") -> realProductPhotoUrl("Camisa Formal", "Blanco"),
      ("camisa formal", "azul") -> realProductPhotoUrl("Camisa Formal", "Azul")
    )

  private def normalizarClaveTexto(value: String): String =
    value.trim.toLowerCase.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n").replaceAll("[^a-z0-9]+", " ").trim

  private def tipoPrenda(nombre: String): String =
    val clave = normalizarClaveTexto(nombre)
    if clave.contains("jean") || clave.contains("pantalon") || clave.contains("pantalo") then "pants"
    else if clave.contains("vestido") then "dress"
    else if clave.contains("casaca") || clave.contains("chaqueta") || clave.contains("abrigo") then "jacket"
    else if clave.contains("zapatilla") || clave.contains("zapato") then "shoe"
    else if clave.contains("camisa") || clave.contains("blusa") || clave.contains("polo") || clave.contains("polera") then "shirt"
    else "shirt"

  private def imagenProductoPorNombre(nombre: String): String =
    realProductPhotoUrl(nombre)

  private def imagenVariantePorProductoYColor(nombre: String, color: String): String =
    realProductPhotoUrl(nombre, color)

  private def sanitizeProductImage(nombre: String, color: String = "", image: String = ""): String =
    val value = Option(image).map(_.trim).getOrElse("")

    if value.isEmpty then
      if color.nonEmpty then imagenVariantePorProductoYColor(nombre, color) else imagenProductoPorNombre(nombre)
    else if value.startsWith("data:image/svg+xml") || value.contains("svg+xml") || (value.contains("base64,") && value.toLowerCase.contains("svg")) then
      if color.nonEmpty then imagenVariantePorProductoYColor(nombre, color) else imagenProductoPorNombre(nombre)
    else if value.startsWith("http://") || value.startsWith("https://") then
      value
    else
      value

  private def buildVariantPayload(nombreProducto: String, rows: ResultSet): ujson.Value =
    val color = Option(rows.getString("color")).getOrElse("")
    val talla = Option(rows.getString("talla")).getOrElse("")
    val precio = Option(rows.getBigDecimal("precio")).map(_.doubleValue).getOrElse(0d)
    val stock = Option(rows.getObject("stock")).map(_.toString.toInt).getOrElse(0)
    val sku = Option(rows.getString("sku")).getOrElse("")
    val variantId = Option(rows.getObject("varianteId")).map(_.toString.toInt).getOrElse(0)

    ujson.Obj(
      "id" -> variantId,
      "talla" -> talla,
      "color" -> color,
      "stock" -> stock,
      "precio" -> precio,
      "sku" -> sku,
      "imagen" -> imagenVariantePorProductoYColor(nombreProducto, color)
    )

  private def buildProductPayload(
      productIdValue: Int,
      nombre: String,
      descripcion: String,
      imagen: String,
      activo: Boolean,
      categoria: String,
      variantes: Seq[ujson.Value],
      images: Seq[ujson.Value]
  ): ujson.Value =
    val productImage = sanitizeProductImage(nombre, "", imagen)
    val colores = variantes.map(v => v("color").str).distinct
    val tallas = variantes.map(v => v("talla").str).distinct
    val precioBase = variantes.headOption.map(_.obj("precio").num.toDouble).getOrElse(0d)

    ujson.Obj(
      "id" -> productIdValue,
      "nombre" -> nombre,
      "descripcion" -> descripcion,
      "precio" -> precioBase,
      "categoria" -> categoria,
      "imagen" -> productImage,
      "imagenPrincipal" -> productImage,
      "activo" -> activo,
      "colores" -> Arr.from(colores),
      "tallas" -> Arr.from(tallas),
      "variantes" -> Arr.from(variantes),
      "imagenes" -> Arr.from(images)
    )

  private def prologRecommendation(
      category: String,
      talla: String,
      color: String
  ): String =
    val query =
      s"recomendar('${sanitizePrologValue(category)}', '${sanitizePrologValue(talla)}', '${sanitizePrologValue(color)}', R), write(R), nl, halt."

    val process = new ProcessBuilder(
      "swipl",
      "-q",
      "-f",
      prologPath.toString,
      "-g",
      query
    )

    process.redirectErrorStream(true)
    val started = process.start()
    val output =
      scala.io.Source
        .fromInputStream(started.getInputStream, "UTF-8")
        .mkString
        .trim

    val exitCode = started.waitFor()
    if exitCode == 0 && output.nonEmpty then output else "Estilo versátil para tu próxima compra."

  private def recomendaciones(
      exchange: HttpExchange
  ): Response =
    if exchange.getRequestMethod != "GET" then
      json("""{"error":"Método no permitido"}""", 405)
    else
      val params = Option(exchange.getRequestURI.getQuery)
        .map(_.split("&").toSeq)
        .getOrElse(Seq.empty[String])
        .foldLeft(Map.empty[String, String]) { (acc, entry) =>
          val parts = entry.split("=", 2)
          if parts.length == 2 then
            val key = URLDecoder.decode(parts(0), StandardCharsets.UTF_8.name())
            val value = URLDecoder.decode(parts(1), StandardCharsets.UTF_8.name())
            acc.updated(key, value)
          else acc
        }

      val category = params.getOrElse("categoria", "mujer")
      val talla = params.getOrElse("talla", "M")
      val color = params.getOrElse("color", "Negro")
      val mensaje = prologRecommendation(category, talla, color)

      json(
        ujson.Obj(
          "categoria" -> category,
          "talla" -> talla,
          "color" -> color,
          "mensaje" -> mensaje
        ).render()
      )

  private def demoAdminResponse: Response =
    val token = createToken(1, "admin")
    json(
      ujson.Obj(
        "token" -> token,
        "usuario" -> "admin",
        "rol" -> "admin",
        "usuarioId" -> 1
      ).render()
    )

  private def correoPermitido(correo: String): Boolean =
    correo.matches("(?i)^[^\\s@]+@(gmail|hotmail)\\.com$")

  private def registro(exchange: HttpExchange): Response =
    if exchange.getRequestMethod != "POST" then
      json("""{"error":"MÃ©todo no permitido"}""", 405)
    else
      val input = ujson.read(body(exchange))
      val nombre = input.obj.get("nombre").map(_.str.trim).getOrElse("")
      val usuario = input.obj.get("usuario").map(_.str.trim.toLowerCase).getOrElse("")
      val correo = input.obj.get("correo").map(_.str.trim.toLowerCase).getOrElse("")
      val clave = input.obj.get("clave").map(_.str).getOrElse("")

      if nombre.length < 2 || nombre.length > 100 then
        json("""{"error":"Escribe tu nombre completo."}""", 400)
      else if !usuario.matches("^[a-z0-9._-]{3,30}$") then
        json("""{"error":"El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo)."}""", 400)
      else if !correoPermitido(correo) then
        json("""{"error":"Usa un correo @gmail.com o @hotmail.com."}""", 400)
      else if clave.length < 6 then
        json("""{"error":"La contraseña debe tener al menos 6 caracteres."}""", 400)
      else
        val nombres = nombre.split("\\s+").filter(_.nonEmpty)
        val nombrePrincipal = nombres.headOption.getOrElse(nombre)
        val apellido = nombres.drop(1).mkString(" ") match
          case "" => "Cliente"
          case value => value
        val passwordHash = BCrypt.hashpw(clave, BCrypt.gensalt(12))

        withConnection { conn =>
          val duplicate = conn.prepareStatement(
            "SELECT TOP 1 IdUsuario FROM dbo.usuarios WHERE Correo = ? OR Usuario = ?"
          )
          try
            duplicate.setString(1, correo)
            duplicate.setString(2, usuario)
            val result = duplicate.executeQuery()
            try
              if result.next() then
                json("""{"error":"Ese usuario o correo ya está registrado."}""", 409)
              else
                val insert = conn.prepareStatement(
                  "INSERT INTO dbo.usuarios " +
                    "(Nombre, Apellido, Correo, Usuario, Contrasena, Rol, Activo) " +
                    "OUTPUT INSERTED.IdUsuario " +
                    "VALUES (?, ?, ?, ?, ?, 'cliente', 1)"
                )
                try
                  insert.setString(1, nombrePrincipal)
                  insert.setString(2, apellido)
                  insert.setString(3, correo)
                  insert.setString(4, usuario)
                  insert.setString(5, passwordHash)
                  val created = insert.executeQuery()
                  try
                    created.next()
                    val id = created.getInt(1)
                    val token = createToken(id, usuario)
                    json(
                      ujson.Obj(
                        "ok" -> true,
                        "token" -> token,
                        "usuario" -> usuario,
                        "rol" -> "cliente",
                        "usuarioId" -> id
                      ).render(),
                      201
                    )
                  finally
                    created.close()
                finally
                  insert.close()
            finally
              result.close()
          finally
            duplicate.close()
        }

  private def login(
      exchange: HttpExchange
  ): Response =
    if exchange.getRequestMethod != "POST" then
      json("""{"error":"Método no permitido"}""", 405)
    else
      withConnection { conn =>
        val input = ujson.read(body(exchange))

        val username =
          input("username").str.trim

        val password =
          input("password").str

        if username.equalsIgnoreCase("admin") && password == "1234" then
          demoAdminResponse
        else
          val statement =
            conn.prepareStatement(
              "SELECT TOP 1 IdUsuario, Correo, Contrasena, Rol " +
                "FROM usuarios " +
                "WHERE (Correo = ? OR Nombre = ? OR LOWER(Usuario) = ?) AND Activo = 1"
            )

          try
            statement.setString(1, username)
            statement.setString(2, username)
            statement.setString(3, username.toLowerCase)

            val result = statement.executeQuery()

            try
              if !result.next() then
                json(
                  """{"error":"Usuario o contraseña incorrectos"}""",
                  401
                )
              else
                val stored =
                  result.getString("Contrasena")

                val valid =
                  stored != null &&
                    (
                      if stored.startsWith("$2") then
                        BCrypt.checkpw(password, stored)
                      else
                        password == stored
                    )

                if !valid then
                  json(
                    """{"error":"Usuario o contraseña incorrectos"}""",
                    401
                  )
                else
                  val userId =
                    result.getInt("IdUsuario")

                  val loggedUser =
                    Option(result.getString("Correo"))
                      .filter(_.nonEmpty)
                      .getOrElse(username)

                  val token =
                    createToken(
                      userId,
                      loggedUser
                    )

                  val rol =
                    Option(result.getString("Rol")).map(_.trim.toLowerCase).getOrElse("cliente")

                  json(
                    ujson.Obj(
                      "token" -> token,
                      "usuario" -> loggedUser,
                      "rol" -> rol,
                      "usuarioId" -> userId
                    ).render()
                  )
            finally
              result.close()
          finally
            statement.close()
      }

  private def categorias(
      exchange: HttpExchange
  ): Response =
    if exchange.getRequestMethod != "GET" then
      json("""{"error":"Método no permitido"}""", 405)
    else
      withConnection { conn =>
        val query =
          conn.createStatement().executeQuery(
            "SELECT IdCategoria id, Nombre nombre, Slug slug, " +
              "Descripcion descripcion, Activo activo " +
              "FROM categorias " +
              "WHERE Activo = 1 " +
              "ORDER BY Nombre"
          )

        try
          val rows =
            Iterator
              .continually(query)
              .takeWhile(_.next())
              .map { result =>
                ujson.Obj(
                  "id" -> result.getInt("id"),
                  "nombre" -> result.getString("nombre"),
                  "slug" -> result.getString("slug"),
                  "descripcion" ->
                    Option(
                      result.getString("descripcion")
                    ).getOrElse(""),
                  "activo" ->
                    result.getBoolean("activo")
                )
              }
              .toSeq

          json(Arr.from(rows).render())
        finally
          query.close()
      }

  private def productos(
      exchange: HttpExchange
  ): Response =
    val parts = pathSegments(exchange)

    if exchange.getRequestMethod == "GET" then
      if parts.length == 2 &&
        parts(0) == "productos" &&
        parts(1).forall(_.isDigit)
      then
        val productId = parts(1).toInt

        withConnection { conn =>
          val productQuery =
            conn.prepareStatement(
              "SELECT p.IdProducto id, p.Nombre nombre, " +
                "p.Descripcion descripcion, p.Imagen imagen, " +
                "p.Activo activo, c.Nombre categoria, " +
                "v.IdVariante varianteId, v.Talla talla, " +
                "v.Color color, v.Stock stock, v.Precio precio, " +
                "v.CodigoSKU sku " +
                "FROM productos p " +
                "LEFT JOIN categorias c " +
                "ON c.IdCategoria = p.IdCategoria " +
                "LEFT JOIN producto_variantes v " +
                "ON v.IdProducto = p.IdProducto " +
                "WHERE p.IdProducto = ? " +
                "ORDER BY v.IdVariante"
            )

          try
            productQuery.setInt(1, productId)

            val rows =
              productQuery.executeQuery()

            try
              if !rows.next() then
                json(
                  """{"error":"Producto no encontrado"}""",
                  404
                )
              else
                val productIdValue =
                  rows.getInt("id")
                val nombre =
                  Option(rows.getString("nombre")).getOrElse("")
                val descripcion =
                  Option(rows.getString("descripcion")).getOrElse("")
                val imagen =
                  Option(rows.getString("imagen")).getOrElse("")
                val activo =
                  rows.getBoolean("activo")
                val categoria =
                  Option(rows.getString("categoria")).getOrElse("Novedades")

                val variants =
                  scala.collection.mutable.ArrayBuffer.empty[
                    ujson.Value
                  ]
                val primeraColor =
                  Option(rows.getString("color")).getOrElse("")

                variants += buildVariantPayload(nombre, rows)
                while rows.next() do
                  variants += buildVariantPayload(nombre, rows)

                val images =
                  if tableExists(
                    conn,
                    "ProductoImagenes"
                  )
                  then
                    val imageQuery =
                      conn.prepareStatement(
                        "SELECT Url url, " +
                          "TextoAlternativo alt, " +
                          "Orden orden " +
                          "FROM ProductoImagenes " +
                          "WHERE IdProducto = ? " +
                          "AND Activo = 1 " +
                          "ORDER BY Orden, IdImagen"
                      )

                    try
                      imageQuery.setInt(
                        1,
                        productId
                      )

                      val imageRows =
                        imageQuery.executeQuery()

                      try
                        val collectedImages =
                          scala.collection.mutable.ArrayBuffer.empty[
                            ujson.Value
                          ]

                        while imageRows.next() do
                          val url = Option(imageRows.getString("url")).getOrElse("")
                          val alt = Option(imageRows.getString("alt")).getOrElse("")
                          val orden =
                            Option(imageRows.getObject("orden"))
                              .map(_.toString.toInt)
                              .getOrElse(0)

                          if url.nonEmpty then
                            collectedImages += ujson.Obj(
                              "url" -> url,
                              "alt" -> alt,
                              "orden" -> orden
                            )

                        collectedImages.toSeq
                      finally
                        imageRows.close()
                    finally
                      imageQuery.close()
                  else
                    Seq.empty

                val colorPrimeraVariante = primeraColor
                val productImage =
                  sanitizeProductImage(nombre, colorPrimeraVariante, imagen)

                json(
                  buildProductPayload(
                    productIdValue,
                    nombre,
                    descripcion,
                    productImage,
                    activo,
                    categoria,
                    variants.toSeq,
                    images
                  ).render()
                )
            finally
              rows.close()
          finally
            productQuery.close()
        }
      else
        withConnection { connection =>
          val query =
            connection
              .createStatement()
              .executeQuery(
                """SELECT p.IdProducto id,
                  |p.Nombre nombre,
                  |p.Genero genero,
                  |COALESCE(v.Precio,0) precio,
                  |COALESCE(v.Stock,0) stock,
                  |COALESCE(c.Nombre,'Novedades') categoria,
                  |COALESCE(v.CodigoSKU,
                  |  CONCAT('NOVA-',p.IdProducto)) sku,
                  |COALESCE(v.Talla,'Única') talla,
                  |COALESCE(v.Color,'Negro') color,
                  |COALESCE(p.Imagen,'') imagen,
                  |p.Activo activo
                  |FROM productos p
                  |LEFT JOIN categorias c
                  |  ON c.IdCategoria=p.IdCategoria
                  |OUTER APPLY (
                  |  SELECT TOP 1 *
                  |  FROM producto_variantes pv
                  |  WHERE pv.IdProducto=p.IdProducto
                  |    AND pv.Activo=1
                  |  ORDER BY pv.IdVariante
                  |) v
                  |ORDER BY p.IdProducto""".stripMargin
              )

          try
            val rows =
              Iterator
                .continually(query)
                .takeWhile(_.next())
                .map { result =>
                  val nombre = Option(result.getString("nombre")).getOrElse("")
                  val color = Option(result.getString("color")).getOrElse("")
                  val fallbackImagen =
                    sanitizeProductImage(nombre, color, Option(result.getString("imagen")).getOrElse(""))

                  ujson.Obj(
                    "id" ->
                      result.getInt("id"),
                    "nombre" ->
                      nombre,
                    "genero" ->
                      result.getString("genero"),
                    "precio" ->
                      result
                        .getBigDecimal("precio")
                        .doubleValue,
                    "stock" ->
                      result.getInt("stock"),
                    "categoria" ->
                      result.getString("categoria"),
                    "sku" ->
                      result.getString("sku"),
                    "talla" ->
                      result.getString("talla"),
                    "color" ->
                      result.getString("color"),
                    "imagen" ->
                      fallbackImagen,
                    "activo" ->
                      result.getBoolean("activo")
                  )
                }
                .toSeq

            json(Arr.from(rows).render())
          finally
            query.close()
        }

    else if exchange.getRequestMethod == "POST" then
      authenticate(exchange) match
        case None =>
          unauthorized
        case Some(_) =>
          withConnection { connection =>
            if !tableExists(
              connection,
              "categorias"
            ) then
              json(
                """{"error":"Migración de categorías no aplicada"}""",
                503
              )
            else
              val input =
                ujson.read(body(exchange))

              val category =
                connection.prepareStatement(
                  "SELECT TOP 1 IdCategoria " +
                    "FROM categorias " +
                    "WHERE Nombre = ? AND Activo = 1"
                )

              try
                category.setString(
                  1,
                  input("categoria").str
                )

                val categoryResult =
                  category.executeQuery()

                try
                  val categoryId =
                    if categoryResult.next() then
                      categoryResult.getInt(1)
                    else
                      1

                  val product =
                    connection.prepareStatement(
                      "INSERT INTO productos " +
                        "(IdCategoria,Nombre,Slug,Descripcion," +
                        "Genero,Marca,Imagen,Activo) " +
                        "OUTPUT INSERTED.IdProducto " +
                        "VALUES (?,?,?,?,?,?,?,1)"
                    )

                  try
                    product.setInt(
                      1,
                      categoryId
                    )
                    product.setString(
                      2,
                      input("nombre").str
                    )
                    product.setString(
                      3,
                      input("nombre").str
                        .toLowerCase
                        .replace(" ", "-")
                    )
                    product.setString(
                      4,
                      input("nombre").str
                    )
                    product.setString(
                      5,
                      "unisex"
                    )
                    product.setString(
                      6,
                      "NOVA"
                    )
                    product.setString(
                      7,
                      input("imagen").str
                    )

                    val inserted =
                      product.executeQuery()

                    try
                      inserted.next()
                      val id =
                        inserted.getInt(1)

                      val variant =
                        connection.prepareStatement(
                          "INSERT INTO producto_variantes " +
                            "(IdProducto,Talla,Color,Stock," +
                            "Precio,CodigoSKU,Activo) " +
                            "VALUES (?,?,?,?,?,?,1)"
                        )

                      try
                        variant.setInt(
                          1,
                          id
                        )
                        variant.setString(
                          2,
                          input("talla").str
                        )
                        variant.setString(
                          3,
                          input("color").str
                        )
                        variant.setInt(
                          4,
                          input("stock").num.toInt
                        )
                        variant.setBigDecimal(
                          5,
                          java.math.BigDecimal
                            .valueOf(
                              input("precio").num
                            )
                        )
                        variant.setString(
                          6,
                          input("sku").str
                        )
                        variant.executeUpdate()
                      finally
                        variant.close()
                    finally
                      inserted.close()
                  finally
                    product.close()
                finally
                  categoryResult.close()
              finally
                category.close()

              json(input.render(), 201)
          }

    else if exchange.getRequestMethod == "DELETE" then
      authenticate(exchange) match
        case None =>
          unauthorized
        case Some(_) =>
          val path = exchange
            .getRequestURI
            .getPath

          val idText =
            path.split("/").lastOption.getOrElse("0")

          if !idText.forall(_.isDigit) then
            json("""{"error":"ID de producto inválido"}""", 400)
          else
            val id = idText.toInt

            withConnection { connection =>
              val statement =
                connection.prepareStatement(
                  "UPDATE productos " +
                    "SET Activo=0 " +
                    "WHERE IdProducto=?"
                )

              try
                statement.setInt(1, id)
                statement.executeUpdate()

                json(
                  s"""{"ok":true,"id":$id}"""
                )
              finally
                statement.close()
            }

    else
      json("""{"error":"Método no permitido"}""", 405)

  private def editarProducto(
      exchange: HttpExchange
  ): Response =
    if exchange.getRequestMethod != "POST" then
      json("""{"error":"Método no permitido"}""", 405)
    else
      authenticate(exchange) match
        case None =>
          unauthorized
        case Some(_) =>
          withConnection { connection =>
            val input =
              ujson.read(body(exchange))

            val statement =
              connection.prepareStatement(
                "UPDATE productos " +
                  "SET Nombre=?, Imagen=? " +
                  "WHERE IdProducto=?"
              )

            try
              statement.setString(
                1,
                input("nombre").str
              )
              statement.setString(
                2,
                input("imagen").str
              )
              statement.setInt(
                3,
                input("id").num.toInt
              )
              statement.executeUpdate()

              json(input.render())
            finally
              statement.close()
          }

  private def carrito(
      exchange: HttpExchange
  ): Response =
    authenticate(exchange) match
      case None =>
        unauthorized
      case Some(user) =>
        val parts = pathSegments(exchange)

        if exchange.getRequestMethod == "GET" then
          withConnection { conn =>
            if !tableExists(conn, "carrito") then
              json(
                """{"error":"Migración de carrito no aplicada"}""",
                503
              )
            else
              val query =
                conn.prepareStatement(
                  "SELECT c.IdCarrito id, " +
                    "c.IdUsuario usuarioId, " +
                    "c.IdVariante varianteId, " +
                    "c.Cantidad cantidad, " +
                    "c.PrecioUnitario precioUnitario, " +
                    "v.Talla talla, v.Color color, " +
                    "p.Nombre nombre, p.Imagen imagen " +
                    "FROM carrito c " +
                    "JOIN producto_variantes v " +
                    "ON v.IdVariante = c.IdVariante " +
                    "JOIN productos p " +
                    "ON p.IdProducto = v.IdProducto " +
                    "WHERE c.IdUsuario = ? " +
                    "ORDER BY c.IdCarrito DESC"
                )

              try
                query.setInt(
                  1,
                  user.id
                )

                val rs =
                  query.executeQuery()

                try
                  val rows =
                    Iterator
                      .continually(rs)
                      .takeWhile(_.next())
                      .map { result =>
                        ujson.Obj(
                          "id" ->
                            result.getInt("id"),
                          "usuarioId" ->
                            result.getInt("usuarioId"),
                          "varianteId" ->
                            result.getInt("varianteId"),
                          "cantidad" ->
                            result.getInt("cantidad"),
                          "precioUnitario" ->
                            result
                              .getBigDecimal(
                                "precioUnitario"
                              )
                              .doubleValue,
                          "talla" ->
                            result.getString("talla"),
                          "color" ->
                            result.getString("color"),
                          "nombre" ->
                            result.getString("nombre"),
                          "imagen" ->
                            result.getString("imagen")
                        )
                      }
                      .toSeq

                  json(Arr.from(rows).render())
                finally
                  rs.close()
              finally
                query.close()
          }

        else if exchange.getRequestMethod == "POST" then
          withConnection { conn =>
            if !tableExists(conn, "carrito") then
              json(
                """{"error":"Migración de carrito no aplicada"}""",
                503
              )
            else
              val input =
                ujson.read(body(exchange))

              val varianteId =
                input("varianteId").num.toInt

              val cantidad =
                input("cantidad").num.toInt

              if cantidad <= 0 then
                json(
                  """{"error":"La cantidad debe ser mayor que cero"}""",
                  400
                )
              else
                val stockStmt =
                  conn.prepareStatement(
                    "SELECT Stock, Precio " +
                      "FROM producto_variantes " +
                      "WHERE IdVariante = ? " +
                      "AND Activo = 1"
                  )

                try
                  stockStmt.setInt(
                    1,
                    varianteId
                  )

                  val stockRs =
                    stockStmt.executeQuery()

                  try
                    if !stockRs.next() then
                      json(
                        """{"error":"Variante no encontrada"}""",
                        404
                      )
                    else
                      val stockActual =
                        stockRs.getInt("Stock")

                      if cantidad > stockActual then
                        json(
                          """{"error":"La cantidad supera el stock disponible"}""",
                          409
                        )
                      else
                        val existing =
                          conn.prepareStatement(
                            "SELECT IdCarrito, Cantidad " +
                              "FROM carrito " +
                              "WHERE IdUsuario = ? " +
                              "AND IdVariante = ?"
                          )

                        try
                          existing.setInt(
                            1,
                            user.id
                          )
                          existing.setInt(
                            2,
                            varianteId
                          )

                          val existingRs =
                            existing.executeQuery()

                          try
                            if existingRs.next() then
                              val id =
                                existingRs.getInt(
                                  "IdCarrito"
                                )

                              val nuevaCantidad =
                                existingRs.getInt(
                                  "Cantidad"
                                ) + cantidad

                              if nuevaCantidad > stockActual then
                                json(
                                  """{"error":"La cantidad total supera el stock disponible"}""",
                                  409
                                )
                              else
                                val update =
                                  conn.prepareStatement(
                                    "UPDATE carrito " +
                                      "SET Cantidad = ?, " +
                                      "PrecioUnitario = ? " +
                                      "WHERE IdCarrito = ?"
                                  )

                                try
                                  update.setInt(
                                    1,
                                    nuevaCantidad
                                  )
                                  update.setBigDecimal(
                                    2,
                                    stockRs
                                      .getBigDecimal(
                                        "Precio"
                                      )
                                  )
                                  update.setInt(
                                    3,
                                    id
                                  )
                                  update.executeUpdate()

                                  json(
                                    s"""{"ok":true,"id":$id,"cantidad":$nuevaCantidad}"""
                                  )
                                finally
                                  update.close()
                            else
                              val insert =
                                conn.prepareStatement(
                                  "INSERT INTO carrito " +
                                    "(IdUsuario, IdVariante, " +
                                    "Cantidad, PrecioUnitario) " +
                                    "VALUES (?, ?, ?, ?)"
                                )

                              try
                                insert.setInt(
                                  1,
                                  user.id
                                )
                                insert.setInt(
                                  2,
                                  varianteId
                                )
                                insert.setInt(
                                  3,
                                  cantidad
                                )
                                insert.setBigDecimal(
                                  4,
                                  stockRs
                                    .getBigDecimal(
                                      "Precio"
                                    )
                                )
                                insert.executeUpdate()

                                json(
                                  """{"ok":true,"mensaje":"Producto agregado al carrito"}"""
                                )
                              finally
                                insert.close()
                          finally
                            existingRs.close()
                        finally
                          existing.close()
                  finally
                    stockRs.close()
                finally
                  stockStmt.close()
          }

        else if exchange.getRequestMethod == "PUT" then
          withConnection { conn =>
            if !tableExists(conn, "carrito") then
              json(
                """{"error":"Migración de carrito no aplicada"}""",
                503
              )
            else
              val input =
                ujson.read(body(exchange))

              val idCarrito =
                input("id").num.toInt

              val cantidad =
                input("cantidad").num.toInt

              if cantidad <= 0 then
                json(
                  """{"error":"La cantidad debe ser mayor que cero"}""",
                  400
                )
              else
                val stmt =
                  conn.prepareStatement(
                    "SELECT c.IdVariante, v.Stock " +
                      "FROM carrito c " +
                      "JOIN producto_variantes v " +
                      "ON v.IdVariante = c.IdVariante " +
                      "WHERE c.IdCarrito = ? " +
                      "AND c.IdUsuario = ?"
                  )

                try
                  stmt.setInt(1, idCarrito)
                  stmt.setInt(2, user.id)

                  val rs =
                    stmt.executeQuery()

                  try
                    if !rs.next() then
                      json(
                        """{"error":"Carrito no encontrado"}""",
                        404
                      )
                    else if cantidad > rs.getInt("Stock") then
                      json(
                        """{"error":"La cantidad supera el stock disponible"}""",
                        409
                      )
                    else
                      val update =
                        conn.prepareStatement(
                          "UPDATE carrito " +
                            "SET Cantidad = ? " +
                            "WHERE IdCarrito = ? " +
                            "AND IdUsuario = ?"
                        )

                      try
                        update.setInt(
                          1,
                          cantidad
                        )
                        update.setInt(
                          2,
                          idCarrito
                        )
                        update.setInt(
                          3,
                          user.id
                        )
                        update.executeUpdate()

                        json(
                          """{"ok":true,"mensaje":"Cantidad actualizada"}"""
                        )
                      finally
                        update.close()
                  finally
                    rs.close()
                finally
                  stmt.close()
          }

        else if exchange.getRequestMethod == "DELETE" then
          val idCarrito =
            if parts.nonEmpty then
              parts.last.toIntOption.getOrElse(0)
            else
              0

          if idCarrito <= 0 then
            json(
              """{"error":"ID de carrito inválido"}""",
              400
            )
          else
            withConnection { conn =>
              if !tableExists(conn, "carrito") then
                json(
                  """{"error":"Migración de carrito no aplicada"}""",
                  503
                )
              else
                val stmt =
                  conn.prepareStatement(
                    "DELETE FROM carrito " +
                      "WHERE IdCarrito = ? " +
                      "AND IdUsuario = ?"
                  )

                try
                  stmt.setInt(
                    1,
                    idCarrito
                  )
                  stmt.setInt(
                    2,
                    user.id
                  )
                  stmt.executeUpdate()

                  json(
                    s"""{"ok":true,"id":$idCarrito}"""
                  )
                finally
                  stmt.close()
            }

        else
          json("""{"error":"Método no permitido"}""", 405)

  private def pedidos(
      exchange: HttpExchange
  ): Response =
    authenticate(exchange) match
      case None =>
        unauthorized
      case Some(user) =>
        val parts = pathSegments(exchange)

        if exchange.getRequestMethod == "GET" then
          withConnection { conn =>
            if !tableExists(conn, "pedidos") then
              json(
                """{"error":"Migración de pedidos no aplicada"}""",
                503
              )
            else
              val query =
                conn.prepareStatement(
                  "SELECT p.IdPedido id, " +
                    "p.IdUsuario usuarioId, " +
                    "p.Estado estado, " +
                    "p.Subtotal subtotal, " +
                    "p.Total total, " +
                    "p.FechaPedido fechaPedido " +
                    "FROM pedidos p " +
                    "WHERE p.IdUsuario = ? " +
                    "ORDER BY p.FechaPedido DESC"
                )

              try
                query.setInt(
                  1,
                  user.id
                )

                val rs =
                  query.executeQuery()

                try
                  val rows =
                    Iterator
                      .continually(rs)
                      .takeWhile(_.next())
                      .map { result =>
                        ujson.Obj(
                          "id" ->
                            result.getInt("id"),
                          "usuarioId" ->
                            result.getInt("usuarioId"),
                          "estado" ->
                            result.getString("estado"),
                          "subtotal" ->
                            result
                              .getBigDecimal(
                                "subtotal"
                              )
                              .doubleValue,
                          "total" ->
                            result
                              .getBigDecimal(
                                "total"
                              )
                              .doubleValue,
                          "fechaPedido" ->
                            result
                              .getTimestamp(
                                "fechaPedido"
                              )
                              .toInstant
                              .toString
                        )
                      }
                      .toSeq

                  json(Arr.from(rows).render())
                finally
                  rs.close()
              finally
                query.close()
          }

        else if exchange.getRequestMethod == "POST" then
          withConnection { conn =>
            if !tableExists(conn, "carrito") ||
              !tableExists(conn, "pedidos") ||
              !tableExists(conn, "pedido_detalle")
            then
              json(
                """{"error":"Migración de ecommerce no aplicada"}""",
                503
              )
            else
              val input =
                ujson.read(body(exchange))

              val direccion =
                input("direccion").str

              val items =
                input("items").arr

              if items.isEmpty then
                json(
                  """{"error":"El pedido requiere al menos un producto"}""",
                  400
                )
              else
                var subtotal = 0.0

                val detalles =
                  scala.collection.mutable.ArrayBuffer
                    .empty[
                      (Int, Int, java.math.BigDecimal)
                    ]

                items.foreach { item =>
                  val variantId =
                    item("varianteId").num.toInt

                  val cantidad =
                    item("cantidad").num.toInt

                  if cantidad <= 0 then
                    throw new IllegalArgumentException(
                      "La cantidad debe ser mayor que cero"
                    )

                  val stockStmt =
                    conn.prepareStatement(
                      "SELECT Stock, Precio " +
                        "FROM producto_variantes " +
                        "WHERE IdVariante = ? " +
                        "AND Activo = 1"
                    )

                  try
                    stockStmt.setInt(
                      1,
                      variantId
                    )

                    val stockRs =
                      stockStmt.executeQuery()

                    try
                      if !stockRs.next() then
                        throw new RuntimeException(
                          s"Variante $variantId no encontrada"
                        )

                      val stockActual =
                        stockRs.getInt("Stock")

                      if cantidad > stockActual then
                        throw new RuntimeException(
                          s"Stock insuficiente para la variante $variantId"
                        )

                      val precio =
                        stockRs.getBigDecimal(
                          "Precio"
                        )

                      subtotal +=
                        precio.doubleValue * cantidad

                      detalles += (
                        (variantId, cantidad, precio)
                      )
                    finally
                      stockRs.close()
                  finally
                    stockStmt.close()
                }

                val total = subtotal

                val pedido =
                  conn.prepareStatement(
                    "INSERT INTO pedidos " +
                      "(IdUsuario, Estado, Subtotal, " +
                      "Total, Moneda, DireccionEnvio) " +
                      "OUTPUT INSERTED.IdPedido " +
                      "VALUES (?, 'pendiente', ?, ?, 'PEN', ?)"
                  )

                try
                  pedido.setInt(
                    1,
                    user.id
                  )
                  pedido.setBigDecimal(
                    2,
                    java.math.BigDecimal.valueOf(
                      subtotal
                    )
                  )
                  pedido.setBigDecimal(
                    3,
                    java.math.BigDecimal.valueOf(
                      total
                    )
                  )
                  pedido.setString(
                    4,
                    direccion
                  )

                  val pedidoRs =
                    pedido.executeQuery()

                  try
                    val pedidoId =
                      if pedidoRs.next() then
                        pedidoRs.getInt(1)
                      else
                        0

                    val detalleStmt =
                      conn.prepareStatement(
                        "INSERT INTO pedido_detalle " +
                          "(IdPedido, IdVariante, Cantidad, " +
                          "PrecioUnitario, Subtotal) " +
                          "VALUES (?, ?, ?, ?, ?)"
                      )

                    try
                      detalles.foreach {
                        case (
                              varianteId,
                              cantidad,
                              precio
                            ) =>
                          val sub =
                            precio.multiply(
                              java.math.BigDecimal
                                .valueOf(
                                  cantidad.toDouble
                                )
                            )

                          detalleStmt.setInt(
                            1,
                            pedidoId
                          )
                          detalleStmt.setInt(
                            2,
                            varianteId
                          )
                          detalleStmt.setInt(
                            3,
                            cantidad
                          )
                          detalleStmt.setBigDecimal(
                            4,
                            precio
                          )
                          detalleStmt.setBigDecimal(
                            5,
                            sub
                          )
                          detalleStmt.executeUpdate()

                          val updateStock =
                            conn.prepareStatement(
                              "UPDATE producto_variantes " +
                                "SET Stock = Stock - ? " +
                                "WHERE IdVariante = ?"
                            )

                          try
                            updateStock.setInt(
                              1,
                              cantidad
                            )
                            updateStock.setInt(
                              2,
                              varianteId
                            )
                            updateStock.executeUpdate()
                          finally
                            updateStock.close()
                      }
                    finally
                      detalleStmt.close()

                    json(
                      ujson.Obj(
                        "ok" -> true,
                        "pedidoId" -> pedidoId,
                        "total" -> total
                      ).render()
                    )
                  finally
                    pedidoRs.close()
                finally
                  pedido.close()
          }

        else
          json("""{"error":"Método no permitido"}""", 405)
