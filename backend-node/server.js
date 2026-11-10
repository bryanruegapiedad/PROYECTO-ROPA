const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const useWindowsAuth = process.env.DB_WINDOWS_AUTH === 'true';
let sql;
let windowsDriverAvailable = true;
try {
  sql = useWindowsAuth ? require('mssql/msnodesqlv8') : require('mssql');
} catch (error) {
  windowsDriverAvailable = false;
  sql = require('mssql');
  console.error(`SQL Server Windows driver unavailable: ${error.code || error.message}`);
}

const app = express();
const PORT = process.env.PORT || 8082;
const JWT_SECRET = process.env.JWT_SECRET || 'clave-secreta-local-ventaropa';
const failedAttempts = new Map();

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

let pool = null;
const hasDbConfig = windowsDriverAvailable && process.env.DB_SERVER && process.env.DB_NAME && (useWindowsAuth || process.env.DB_USER);

if (hasDbConfig) {
  const config = useWindowsAuth
    ? {
        connectionString: process.env.DB_CONNECTION_STRING || `Driver={ODBC Driver 18 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_NAME};Trusted_Connection=Yes;TrustServerCertificate=${process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false' ? 'Yes' : 'No'}`,
      }
    : {
        server: process.env.DB_SERVER,
        port: Number(process.env.DB_PORT || 1433),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        },
      };

  config.requestTimeout = Number(process.env.DB_REQUEST_TIMEOUT || 10000);
  pool = new sql.ConnectionPool(config);

  console.log(`SQL Server enabled. Connecting to database ${process.env.DB_NAME}...`);
} else {
  console.log('No SQL Server config detected. Using in-memory data for local testing.');
}

let productos = [
  { id: 1, sku: 'NOV-BLZ-001', nombre: 'Blazer oversize', precio: 189, stock: 18, categoria: 'Prendas superiores', genero: 'mujeres', talla: 'M', color: 'Negro carbón', imagen: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 2, sku: 'NOV-VES-002', nombre: 'Vestido satén midi', precio: 229, stock: 7, categoria: 'Vestidos', genero: 'mujeres', talla: 'S', color: 'Verde oliva', imagen: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 3, sku: 'NOV-PAN-003', nombre: 'Pantalón wide leg', precio: 149, stock: 24, categoria: 'Pantalones', genero: 'mujeres', talla: 'L', color: 'Beige arena', imagen: 'https://images.unsplash.com/photo-1506629905607-d9c297d4a5c5?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 4, sku: 'NOV-ZAP-004', nombre: 'Zapatillas street', precio: 159, stock: 15, categoria: 'Calzado', genero: 'varones', talla: '42', color: 'Blanco', imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85', activo: true },
  { id: 5, sku: 'NOV-SUD-005', nombre: 'Sudadera arcoíris', precio: 99, stock: 12, categoria: 'Prendas superiores', genero: 'niñas', talla: '10', color: 'Lavanda', imagen: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=700&q=85', activo: true },
  { id: 6, sku: 'NOV-POL-006', nombre: 'Polo esencial', precio: 69, stock: 20, categoria: 'Prendas superiores', genero: 'niños', talla: '12', color: 'Azul cielo', imagen: 'https://images.unsplash.com/photo-1519238263530-99bad5d7d3a0?auto=format&fit=crop&w=700&q=85', activo: true },
  { id: 7, sku: 'NOV-CAM-007', nombre: 'Camiseta premium', precio: 89, stock: 26, categoria: 'Prendas superiores', genero: 'varones', talla: 'M', color: 'Blanco hueso', imagen: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 8, sku: 'NOV-CHA-008', nombre: 'Chaqueta bomber', precio: 219, stock: 11, categoria: 'Prendas superiores', genero: 'mujeres', talla: 'L', color: 'Caqui', imagen: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 9, sku: 'NOV-JEN-009', nombre: 'Jean straight fit', precio: 169, stock: 13, categoria: 'Pantalones', genero: 'varones', talla: '32', color: 'Indigo', imagen: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 10, sku: 'NOV-SHL-010', nombre: 'Top de encaje', precio: 95, stock: 16, categoria: 'Prendas superiores', genero: 'mujeres', talla: 'S', color: 'Blanco marfil', imagen: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 11, sku: 'NOV-SET-011', nombre: 'Conjunto deportivo', precio: 179, stock: 9, categoria: 'Sets', genero: 'niñas', talla: '8', color: 'Rosado pastel', imagen: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 12, sku: 'NOV-SKI-012', nombre: 'Skirt de lino', precio: 129, stock: 14, categoria: 'Faldas', genero: 'mujeres', talla: 'M', color: 'Terracota', imagen: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 13, sku: 'NOV-COA-013', nombre: 'Coat minimal', precio: 249, stock: 8, categoria: 'Prendas superiores', genero: 'mujeres', talla: 'XL', color: 'Camel', imagen: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=500&q=80', activo: true },
  { id: 14, sku: 'NOV-BOT-014', nombre: 'Botines premium', precio: 199, stock: 15, categoria: 'Calzado', genero: 'mujeres', talla: '39', color: 'Marrón', imagen: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85', activo: true },
];
const usuariosMemoria = [{ id: 'demo-admin', usuario: 'admin', correo: 'admin@tiendaropa.com', passwordHash: bcrypt.hashSync('1234', 10), nombre: 'Administrador', rol: 'admin' }];
const pedidosMemoria = [];
let siguientePedidoId = 1;

async function ensureDatabase() {
  if (!pool) return;
  const fashionSchema = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.productos', 'Descripcion') IS NOT NULL AND COL_LENGTH('dbo.producto_variantes', 'CodigoSKU') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
  await pool.request().query(`
    IF OBJECT_ID('dbo.usuarios', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.usuarios', 'Usuario') IS NULL ALTER TABLE dbo.usuarios ADD Usuario VARCHAR(100) NULL;
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'UX_usuarios_Usuario')
        CREATE UNIQUE INDEX UX_usuarios_Usuario ON dbo.usuarios(Usuario) WHERE Usuario IS NOT NULL;
    END
  `);
  if (fashionSchema.recordset[0].enabled === 1) {
    console.log('Esquema TiendaRopa detectado; se conserva su modelo de moda.');
    return;
  }

  await pool.request().query(`
    IF OBJECT_ID('dbo.productos', 'U') IS NULL
    CREATE TABLE productos (
      IdProducto INT IDENTITY(1,1) PRIMARY KEY,
      Nombre VARCHAR(255) NOT NULL,
      Precio NUMERIC(10,2) NOT NULL,
      Stock INTEGER NOT NULL,
      IdCategoria INTEGER NOT NULL,
      Categoria VARCHAR(100) NULL,
      SKU VARCHAR(50) NULL,
      Talla VARCHAR(20) NULL,
      Color VARCHAR(100) NULL,
      Imagen VARCHAR(500) NULL,
      Activo BIT NOT NULL DEFAULT 1
    )
  `);
  await pool.request().query(`
    IF COL_LENGTH('dbo.productos', 'Categoria') IS NULL ALTER TABLE productos ADD Categoria VARCHAR(100) NULL;
    IF COL_LENGTH('dbo.productos', 'SKU') IS NULL ALTER TABLE productos ADD SKU VARCHAR(50) NULL;
    IF COL_LENGTH('dbo.productos', 'Talla') IS NULL ALTER TABLE productos ADD Talla VARCHAR(20) NULL;
    IF COL_LENGTH('dbo.productos', 'Color') IS NULL ALTER TABLE productos ADD Color VARCHAR(100) NULL;
    IF COL_LENGTH('dbo.productos', 'Imagen') IS NULL ALTER TABLE productos ADD Imagen VARCHAR(500) NULL;
    IF COL_LENGTH('dbo.productos', 'Activo') IS NULL ALTER TABLE productos ADD Activo BIT NOT NULL CONSTRAINT DF_productos_activo DEFAULT 1;
  `);
  await pool.request().query(`
    UPDATE productos SET Categoria = COALESCE(Categoria, 'Novedades'), SKU = COALESCE(SKU, CONCAT('NOV-', IdProducto)), Talla = COALESCE(Talla, 'M'), Color = COALESCE(Color, 'Negro'), Activo = COALESCE(Activo, 1) WHERE Categoria IS NULL OR SKU IS NULL OR Talla IS NULL OR Color IS NULL;
  `);
  await pool.request().query(`
    IF OBJECT_ID('dbo.categorias', 'U') IS NULL
    CREATE TABLE categorias (
      IdCategoria INT IDENTITY(1,1) PRIMARY KEY,
      Nombre VARCHAR(100) NOT NULL UNIQUE,
      Slug VARCHAR(120) NOT NULL UNIQUE,
      Activo BIT NOT NULL DEFAULT 1,
      CreadoEn DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
  await pool.request().query(`
    IF COL_LENGTH('dbo.categorias', 'Slug') IS NULL ALTER TABLE categorias ADD Slug VARCHAR(120) NULL;
    IF COL_LENGTH('dbo.categorias', 'Activo') IS NULL ALTER TABLE categorias ADD Activo BIT NOT NULL CONSTRAINT DF_categorias_activo DEFAULT 1;
    IF COL_LENGTH('dbo.categorias', 'CreadoEn') IS NULL ALTER TABLE categorias ADD CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_categorias_creado DEFAULT SYSUTCDATETIME();
  `);
  await pool.request().query(`
    UPDATE categorias SET Slug = LOWER(REPLACE(Nombre, ' ', '-')) WHERE Slug IS NULL;
  `);
  await pool.request().query(`
    INSERT INTO categorias (Nombre, Slug)
    SELECT v.Nombre, v.Slug
    FROM (VALUES ('Vestidos','vestidos'),('Prendas superiores','prendas-superiores'),('Pantalones','pantalones'),('Accesorios','accesorios'),('Novedades','novedades')) v(Nombre, Slug)
    WHERE NOT EXISTS (SELECT 1 FROM categorias c WHERE c.Slug = v.Slug);
  `);
  await pool.request().query(`
    IF OBJECT_ID('dbo.producto_variantes', 'U') IS NULL
    CREATE TABLE producto_variantes (
      IdVariante INT IDENTITY(1,1) PRIMARY KEY,
      IdProducto INT NOT NULL,
      Talla VARCHAR(20) NOT NULL,
      Color VARCHAR(100) NOT NULL,
      Stock INT NOT NULL DEFAULT 0 CHECK (Stock >= 0),
      Precio NUMERIC(10,2) NULL CHECK (Precio >= 0),
      Activo BIT NOT NULL DEFAULT 1,
      CONSTRAINT FK_variantes_productos FOREIGN KEY (IdProducto) REFERENCES productos(IdProducto)
    );
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM producto_variantes)
    INSERT INTO producto_variantes (IdProducto, Talla, Color, Stock, Precio)
    SELECT IdProducto, COALESCE(Talla, 'M'), COALESCE(Color, 'Negro'), Stock, Precio FROM productos;
  `);
  await pool.request().query(`
    IF OBJECT_ID('dbo.pedidos', 'U') IS NULL
    CREATE TABLE pedidos (
      IdPedido INT IDENTITY(1,1) PRIMARY KEY,
      IdUsuario INT NULL,
      Estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
      Subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
      Total NUMERIC(10,2) NOT NULL DEFAULT 0,
      Moneda CHAR(3) NOT NULL DEFAULT 'PEN',
      CreadoEn DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT FK_pedidos_usuarios FOREIGN KEY (IdUsuario) REFERENCES usuarios(IdUsuario)
    );
    IF OBJECT_ID('dbo.pedido_detalle', 'U') IS NULL
    CREATE TABLE pedido_detalle (
      IdDetalle INT IDENTITY(1,1) PRIMARY KEY,
      IdPedido INT NOT NULL,
      IdVariante INT NOT NULL,
      Cantidad INT NOT NULL CHECK (Cantidad > 0),
      PrecioUnitario NUMERIC(10,2) NOT NULL CHECK (PrecioUnitario >= 0),
      CONSTRAINT FK_detalle_pedidos FOREIGN KEY (IdPedido) REFERENCES pedidos(IdPedido),
      CONSTRAINT FK_detalle_variantes FOREIGN KEY (IdVariante) REFERENCES producto_variantes(IdVariante)
    );
  `);

  await pool.request().query(`
    IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
    CREATE TABLE usuarios (
      IdUsuario INT IDENTITY(1,1) PRIMARY KEY,
      Usuario VARCHAR(100) NOT NULL UNIQUE,
      PasswordHash VARCHAR(255) NOT NULL,
      Correo VARCHAR(255) NOT NULL UNIQUE,
      Activo BIT NOT NULL DEFAULT 1
    );
    IF OBJECT_ID('dbo.tokens_recuperacion', 'U') IS NULL
    CREATE TABLE tokens_recuperacion (
      IdToken INT IDENTITY(1,1) PRIMARY KEY,
      IdUsuario INT NOT NULL,
      TokenHash VARCHAR(64) NOT NULL,
      ExpiraEn DATETIME2 NOT NULL,
      UsadoEn DATETIME2 NULL,
      CONSTRAINT FK_tokens_recuperacion_usuarios FOREIGN KEY (IdUsuario) REFERENCES usuarios(IdUsuario)
    );
  `);

  // Migra la tabla de usuarios preexistente (IdUsuario, Usuario, Clave, Rol) sin conservar claves en texto plano.
  await pool.request().query(`
    IF COL_LENGTH('dbo.usuarios', 'PasswordHash') IS NULL ALTER TABLE usuarios ADD PasswordHash VARCHAR(255) NULL;
    IF COL_LENGTH('dbo.usuarios', 'Correo') IS NULL ALTER TABLE usuarios ADD Correo VARCHAR(255) NULL;
    IF COL_LENGTH('dbo.usuarios', 'Activo') IS NULL ALTER TABLE usuarios ADD Activo BIT NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT 1;
    IF COL_LENGTH('dbo.usuarios', 'Usuario') IS NULL ALTER TABLE usuarios ADD Usuario VARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'UX_usuarios_Usuario')
      CREATE UNIQUE INDEX UX_usuarios_Usuario ON dbo.usuarios(Usuario) WHERE Usuario IS NOT NULL;
  `);
  const legacyUsers = await pool.request().query('SELECT IdUsuario, Usuario, Clave FROM usuarios WHERE PasswordHash IS NULL');
  for (const legacyUser of legacyUsers.recordset) {
    const passwordHash = await bcrypt.hash(String(legacyUser.Clave || crypto.randomBytes(32).toString('hex')), 12);
    await pool.request()
      .input('idUsuario', sql.Int, legacyUser.IdUsuario)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .input('correo', sql.VarChar(255), `${legacyUser.Usuario}@inventario.local`)
      .query('UPDATE usuarios SET PasswordHash = @passwordHash, Correo = COALESCE(Correo, @correo) WHERE IdUsuario = @idUsuario');
  }

  const usuarioAdmin = await pool.request().input('usuario', sql.VarChar(100), 'admin')
    .query('SELECT IdUsuario FROM usuarios WHERE Usuario = @usuario');
  if (usuarioAdmin.recordset.length === 0) {
    const passwordHash = await bcrypt.hash('1234', 12);
    await pool.request()
      .input('usuario', sql.VarChar(100), 'admin')
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .input('correo', sql.VarChar(255), 'admin@inventario.local')
      .query('INSERT INTO usuarios (Usuario, PasswordHash, Correo) VALUES (@usuario, @passwordHash, @correo)');
    console.log('Usuario inicial creado: admin. Cambia su contraseña antes de usar la aplicación en producción.');
  } else if (process.env.RESET_DEMO_ADMIN === 'true') {
    const passwordHash = await bcrypt.hash('1234', 12);
    await pool.request()
      .input('usuario', sql.VarChar(100), 'admin')
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .query('UPDATE usuarios SET PasswordHash = @passwordHash, Activo = 1 WHERE Usuario = @usuario');
    console.log('Credenciales demo restablecidas: admin / 1234.');
  }

  const { recordset } = await pool.request().query('SELECT * FROM productos');

  if (recordset.length === 0) {
    await pool.request().query(`
      INSERT INTO productos (Nombre, Precio, Stock, IdCategoria) VALUES
      ('Blazer oversize', 189, 18, 1), ('Vestido satén midi', 229, 7, 2), ('Pantalón wide leg', 149, 24, 3)
    `);
  }
}

async function getProductos() {
  if (pool) {
    const fashionSchema = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.productos', 'Descripcion') IS NOT NULL AND COL_LENGTH('dbo.producto_variantes', 'CodigoSKU') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
    if (fashionSchema.recordset[0].enabled === 1) {
      const result = await pool.request().query(`SELECT p.IdProducto AS id, p.Nombre AS nombre, COALESCE(v.Precio, 0) AS precio, COALESCE(v.Stock, 0) AS stock, COALESCE(c.Nombre, 'Novedades') AS categoria, COALESCE(p.Genero, 'mujeres') AS genero, COALESCE(v.CodigoSKU, CONCAT('NOVA-', p.IdProducto)) AS sku, COALESCE(v.Talla, 'Única') AS talla, COALESCE(v.Color, 'Negro') AS color, COALESCE(p.Imagen, 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=300&q=80') AS imagen, CAST(p.Activo AS bit) AS activo FROM productos p LEFT JOIN categorias c ON c.IdCategoria = p.IdCategoria OUTER APPLY (SELECT TOP 1 * FROM producto_variantes pv WHERE pv.IdProducto = p.IdProducto AND pv.Activo = 1 ORDER BY pv.IdVariante) v ORDER BY p.IdProducto`);
      return result.recordset.map((p) => ({ id: Number(p.id), nombre: p.nombre, precio: Number(p.precio), stock: Number(p.stock), categoria: p.categoria, genero: p.genero, sku: p.sku, talla: p.talla, color: p.color, imagen: p.imagen, activo: Boolean(p.activo) }));
    }
    const result = await pool.request().query(`SELECT IdProducto AS id, Nombre AS nombre, Precio AS precio, Stock AS stock, COALESCE(Categoria, 'Novedades') AS categoria, COALESCE(SKU, CONCAT('NOV-', IdProducto)) AS sku, COALESCE(Talla, 'M') AS talla, COALESCE(Color, 'Negro') AS color, COALESCE(Imagen, 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=300&q=80') AS imagen, COALESCE(Activo, 1) AS activo FROM productos ORDER BY IdProducto`);
    return result.recordset.map((p) => ({
      id: Number(p.id),
      nombre: p.nombre,
      precio: Number(p.precio),
      stock: Number(p.stock),
      categoria: p.categoria,
      sku: p.sku,
      talla: p.talla,
      color: p.color,
      imagen: p.imagen,
      activo: Boolean(p.activo),
    }));
  }

  return productos;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'backend running' });
});

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sesión requerida' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}

app.get('/productos', async (req, res) => {
  try {
    const data = await getProductos();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

app.get('/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'El identificador del producto no es válido.' });
  }

  try {
    const producto = (await getProductos()).find(item => Number(item.id) === id && item.activo !== false);
    if (!producto) return res.status(404).json({ error: 'No encontramos esta prenda. Puede que ya no esté disponible.' });

    const variante = {
      id: producto.id,
      talla: producto.talla || 'Única',
      color: producto.color || 'Negro',
      stock: Number(producto.stock) || 0,
      precio: Number(producto.precio) || 0,
      sku: producto.sku || `NOVA-${producto.id}`,
    };
    return res.json({
      ...producto,
      descripcion: producto.descripcion || `Prenda ${producto.nombre} de nuestra colección.`,
      variantes: [variante],
      imagenes: producto.imagen ? [{ url: producto.imagen, alt: producto.nombre, orden: 0 }] : [],
    });
  } catch (error) {
    console.error('Error al cargar detalle del producto:', error);
    return res.status(500).json({ error: 'No se pudo cargar esta prenda. Inténtalo de nuevo.' });
  }
});

app.post('/productos', requireAuth, async (req, res) => {
  try {
    const { sku, nombre, precio, stock, categoria, talla, color, imagen, activo = true } = req.body;

    if (!nombre || precio === undefined || stock === undefined || categoria === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const nuevo = {
      id: Date.now(),
      nombre,
      precio: Number(precio),
      stock: Number(stock),
      categoria, sku, talla, color, imagen, activo: Boolean(activo),
    };

    if (pool) {
      const fashionSchema = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.productos', 'Descripcion') IS NOT NULL AND COL_LENGTH('dbo.producto_variantes', 'CodigoSKU') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
      if (fashionSchema.recordset[0].enabled === 1) {
        const category = await pool.request().input('categoria', sql.VarChar(100), categoria).query('SELECT TOP 1 IdCategoria FROM categorias WHERE Nombre = @categoria AND Activo = 1');
        const categoryId = category.recordset[0]?.IdCategoria || 1;
        const product = await pool.request().input('nombre', sql.VarChar(255), nombre).input('categoria', sql.Int, categoryId).input('imagen', sql.VarChar(500), imagen || '').input('activo', sql.Bit, Boolean(activo)).query(`INSERT INTO productos (IdCategoria, Nombre, Slug, Descripcion, Genero, Marca, Imagen, Activo) OUTPUT INSERTED.IdProducto AS id VALUES (@categoria, @nombre, LOWER(REPLACE(@nombre, ' ', '-')), @nombre, 'unisex', 'NOVA', @imagen, @activo)`);
        const productId = product.recordset[0].id;
        await pool.request().input('idProducto', sql.Int, productId).input('talla', sql.VarChar(20), talla || 'Única').input('color', sql.VarChar(100), color || 'Negro').input('stock', sql.Int, Number(stock)).input('precio', sql.Decimal(10, 2), Number(precio)).input('sku', sql.VarChar(50), sku || `NOVA-${productId}`).query('INSERT INTO producto_variantes (IdProducto, Talla, Color, Stock, Precio, CodigoSKU, Activo) VALUES (@idProducto, @talla, @color, @stock, @precio, @sku, 1)');
        return res.status(201).json({ ...nuevo, id: productId });
      }
      const result = await pool.request()
        .input('nombre', sql.VarChar(255), nuevo.nombre)
        .input('precio', sql.Decimal(10, 2), nuevo.precio)
        .input('stock', sql.Int, nuevo.stock)
        .input('categoria', sql.VarChar(100), nuevo.categoria)
        .input('sku', sql.VarChar(50), nuevo.sku)
        .input('talla', sql.VarChar(20), nuevo.talla)
        .input('color', sql.VarChar(100), nuevo.color)
        .input('imagen', sql.VarChar(500), nuevo.imagen)
        .input('activo', sql.Bit, nuevo.activo)
        .query('INSERT INTO productos (Nombre, Precio, Stock, IdCategoria, Categoria, SKU, Talla, Color, Imagen, Activo) OUTPUT INSERTED.IdProducto AS id, INSERTED.Nombre AS nombre, INSERTED.Precio AS precio, INSERTED.Stock AS stock, INSERTED.Categoria AS categoria, INSERTED.SKU AS sku, INSERTED.Talla AS talla, INSERTED.Color AS color, INSERTED.Imagen AS imagen, INSERTED.Activo AS activo VALUES (@nombre, @precio, @stock, 1, @categoria, @sku, @talla, @color, @imagen, @activo)');

      return res.status(201).json(result.recordset[0]);
    }

    productos.push(nuevo);
    return res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.post('/productos/editar', requireAuth, async (req, res) => {
  try {
    const { id, sku, nombre, precio, stock, categoria, talla, color, imagen, activo = true } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Falta el id del producto' });
    }

    if (pool) {
      const fashionSchema = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.productos', 'Descripcion') IS NOT NULL AND COL_LENGTH('dbo.producto_variantes', 'CodigoSKU') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
      if (fashionSchema.recordset[0].enabled === 1) {
        const category = await pool.request().input('categoria', sql.VarChar(100), categoria).query('SELECT TOP 1 IdCategoria FROM categorias WHERE Nombre = @categoria AND Activo = 1');
        const categoryId = category.recordset[0]?.IdCategoria || 1;
        const result = await pool.request().input('id', sql.Int, Number(id)).input('nombre', sql.VarChar(255), nombre).input('categoria', sql.Int, categoryId).input('imagen', sql.VarChar(500), imagen || '').input('activo', sql.Bit, Boolean(activo)).query(`UPDATE productos SET Nombre = @nombre, Slug = LOWER(REPLACE(@nombre, ' ', '-')), IdCategoria = @categoria, Imagen = @imagen, Activo = @activo WHERE IdProducto = @id`);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        await pool.request().input('idProducto', sql.Int, Number(id)).input('talla', sql.VarChar(20), talla || 'Única').input('color', sql.VarChar(100), color || 'Negro').input('stock', sql.Int, Number(stock)).input('precio', sql.Decimal(10, 2), Number(precio)).input('sku', sql.VarChar(50), sku).query('UPDATE TOP (1) producto_variantes SET Talla = @talla, Color = @color, Stock = @stock, Precio = @precio, CodigoSKU = @sku WHERE IdProducto = @idProducto');
        return res.json({ id: Number(id), nombre, precio: Number(precio), stock: Number(stock), categoria, sku, talla, color, imagen, activo: Boolean(activo) });
      }
      const result = await pool.request()
        .input('id', sql.Int, Number(id))
        .input('nombre', sql.VarChar(255), nombre)
        .input('precio', sql.Decimal(10, 2), Number(precio))
        .input('stock', sql.Int, Number(stock))
        .input('categoria', sql.VarChar(100), categoria)
        .input('sku', sql.VarChar(50), sku)
        .input('talla', sql.VarChar(20), talla)
        .input('color', sql.VarChar(100), color)
        .input('imagen', sql.VarChar(500), imagen)
        .input('activo', sql.Bit, Boolean(activo))
        .query('UPDATE productos SET Nombre = @nombre, Precio = @precio, Stock = @stock, Categoria = @categoria, SKU = @sku, Talla = @talla, Color = @color, Imagen = @imagen, Activo = @activo OUTPUT INSERTED.IdProducto AS id, INSERTED.Nombre AS nombre, INSERTED.Precio AS precio, INSERTED.Stock AS stock, INSERTED.Categoria AS categoria, INSERTED.SKU AS sku, INSERTED.Talla AS talla, INSERTED.Color AS color, INSERTED.Imagen AS imagen, INSERTED.Activo AS activo WHERE IdProducto = @id');

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      return res.json(result.recordset[0]);
    }

    const index = productos.findIndex((p) => p.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    productos[index] = {
      ...productos[index],
      nombre,
      precio: Number(precio),
      stock: Number(stock),
      sku, categoria, talla, color, imagen, activo: Boolean(activo),
    };

    return res.json(productos[index]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar producto' });
  }
});

app.delete('/productos/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (pool) {
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM productos WHERE IdProducto = @id');
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      return res.json({ ok: true, id });
    }

    const initialLength = productos.length;
    productos = productos.filter((p) => p.id !== id);

    if (productos.length === initialLength) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

app.post('/registro', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const usuario = String(req.body.usuario || '').trim().toLowerCase();
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const clave = String(req.body.clave || '');
  if (nombre.length < 2 || nombre.length > 100) return res.status(400).json({ error: 'Escribe tu nombre completo.' });
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return res.status(400).json({ error: 'El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo).' });
  if (!/^[^\s@]+@(gmail|hotmail)\.com$/i.test(correo)) return res.status(400).json({ error: 'Usa un correo @gmail.com o @hotmail.com.' });
  if (!nombre || !usuario || !correo || clave.length < 6) {
    return res.status(400).json({ error: 'Completa todos los campos. La contraseña debe tener al menos 6 caracteres.' });
  }
  try {
    const passwordHash = await bcrypt.hash(clave, 10);
    if (!pool) {
      if (usuariosMemoria.some(item => item.usuario === usuario || item.correo === correo)) {
        return res.status(409).json({ error: 'El usuario o correo ya está registrado.' });
      }
      const nuevoUsuario = { id: `user-${Date.now()}`, nombre, usuario, correo, passwordHash, rol: 'cliente' };
      usuariosMemoria.push(nuevoUsuario);
      return res.status(201).json({
        ok: true,
        token: jwt.sign({ sub: nuevoUsuario.id, username: usuario, rol: 'cliente' }, JWT_SECRET, { expiresIn: '8h' }),
        usuario,
        rol: 'cliente',
      });
    }

    const esquemaModa = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.usuarios', 'Contrasena') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
    const duplicado = await pool.request()
      .input('correo', sql.VarChar(150), correo)
      .input('usuario', sql.VarChar(100), usuario)
      .query('SELECT TOP 1 IdUsuario FROM usuarios WHERE Correo = @correo OR Usuario = @usuario');
    if (duplicado.recordset.length) return res.status(409).json({ error: 'El correo ya está registrado.' });

    const nombres = nombre.split(/\s+/);
    const nombrePrincipal = nombres.shift() || nombre;
    const apellido = nombres.join(' ') || 'Cliente';
    if (esquemaModa.recordset[0].enabled === 1) {
      await pool.request()
        .input('nombre', sql.VarChar(100), nombrePrincipal)
        .input('apellido', sql.VarChar(100), apellido)
        .input('correo', sql.VarChar(150), correo)
        .input('usuario', sql.VarChar(100), usuario)
        .input('contrasena', sql.VarChar(255), passwordHash)
        .query("INSERT INTO usuarios (Nombre, Apellido, Correo, Usuario, Contrasena, Rol, Activo) VALUES (@nombre, @apellido, @correo, @usuario, @contrasena, 'cliente', 1)");
      const creado = await pool.request().input('correo', sql.VarChar(150), correo)
        .query('SELECT TOP 1 IdUsuario FROM usuarios WHERE Correo = @correo ORDER BY IdUsuario DESC');
      const idUsuario = creado.recordset[0].IdUsuario;
      return res.status(201).json({ ok: true, token: jwt.sign({ sub: idUsuario, username: correo, rol: 'cliente' }, JWT_SECRET, { expiresIn: '8h' }), usuario: correo, rol: 'cliente' });
    }

    const duplicadoUsuario = await pool.request().input('usuario', sql.VarChar(100), usuario)
      .query('SELECT TOP 1 IdUsuario FROM usuarios WHERE Usuario = @usuario');
    if (duplicadoUsuario.recordset.length) return res.status(409).json({ error: 'El usuario ya está registrado.' });
    await pool.request()
      .input('usuario', sql.VarChar(100), usuario)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .input('correo', sql.VarChar(255), correo)
      .query('INSERT INTO usuarios (Usuario, PasswordHash, Correo, Activo) VALUES (@usuario, @passwordHash, @correo, 1)');
    const creado = await pool.request().input('usuario', sql.VarChar(100), usuario)
      .query('SELECT TOP 1 IdUsuario FROM usuarios WHERE Usuario = @usuario ORDER BY IdUsuario DESC');
    return res.status(201).json({ ok: true, token: jwt.sign({ sub: creado.recordset[0].IdUsuario, username: usuario, rol: 'cliente' }, JWT_SECRET, { expiresIn: '8h' }), usuario, rol: 'cliente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo guardar el registro en la base de datos.' });
  }
});

app.get('/pedidos', requireAuth, (req, res) => {
  res.json(pedidosMemoria);
});

app.get('/pedidos/rotacion', requireAuth, (req, res) => {
  const rotacion = productos.map(producto => ({
    productoId: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    unidadesVendidas: pedidosMemoria
      .filter(pedido => pedido.estado !== 'Cancelado')
      .flatMap(pedido => pedido.items)
      .filter(item => item.productoId === producto.id)
      .reduce((total, item) => total + item.cantidad, 0),
  })).sort((a, b) => b.unidadesVendidas - a.unidadesVendidas);
  res.json(rotacion);
});

app.post('/pedidos', async (req, res) => {
  const cliente = String(req.body.cliente || '').trim();
  const direccionEnvio = String(req.body.direccionEnvio || '').trim();
  const metodoPago = String(req.body.metodoPago || 'Efectivo').trim() || 'Efectivo';
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!cliente || !items.length) {
    return res.status(400).json({ error: 'Indica el cliente y al menos un producto.' });
  }
  if (!direccionEnvio) {
    return res.status(400).json({ error: 'Ingresa la dirección de entrega.' });
  }

  // 1. Si SQL Server está disponible con pool activo
  if (pool) {
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Mapear método de pago a ID existente o crear por defecto
      let idMetodoPago = 1;
      try {
        const metodoRes = await new sql.Request(transaction)
          .input('nombreMetodo', sql.VarChar(80), metodoPago)
          .query(`
            SELECT TOP 1 IdMetodoPago FROM metodos_pago 
            WHERE LOWER(Nombre) = LOWER(@nombreMetodo) OR Nombre LIKE '%' + @nombreMetodo + '%'
          `);
        if (metodoRes.recordset.length) {
          idMetodoPago = metodoRes.recordset[0].IdMetodoPago;
        } else {
          const primerMetodo = await new sql.Request(transaction).query('SELECT TOP 1 IdMetodoPago FROM metodos_pago ORDER BY IdMetodoPago ASC');
          if (primerMetodo.recordset.length) idMetodoPago = primerMetodo.recordset[0].IdMetodoPago;
        }
      } catch (e) {
        // Fallback a ID 1 si la tabla de métodos no responde
        idMetodoPago = 1;
      }

      // Validar stock de cada variante en la base de datos
      let subtotalGeneral = 0;
      const detalleProcesado = [];

      for (const item of items) {
        let idVariante = Number(item.varianteId);
        let idProducto = Number(item.productoId);
        const cantidad = Number(item.cantidad) || 1;
        const nombrePrenda = String(item.nombre || '').trim();

        let stockCheck = { recordset: [] };

        // 1. Buscar por IdVariante exacto si es válido
        if (idVariante && idVariante > 0) {
          stockCheck = await new sql.Request(transaction)
            .input('idVariante', sql.Int, idVariante)
            .query(`
              SELECT TOP 1 v.IdVariante, v.IdProducto, v.Stock, v.Precio, v.Talla, v.Color, p.Nombre
              FROM producto_variantes v
              INNER JOIN productos p ON p.IdProducto = v.IdProducto
              WHERE v.IdVariante = @idVariante
            `);
        }

        // 2. Si no encontró por variante, buscar por IdProducto
        if (!stockCheck.recordset.length && idProducto && idProducto > 0) {
          stockCheck = await new sql.Request(transaction)
            .input('idProducto', sql.Int, idProducto)
            .query(`
              SELECT TOP 1 v.IdVariante, v.IdProducto, v.Stock, v.Precio, v.Talla, v.Color, p.Nombre
              FROM producto_variantes v
              INNER JOIN productos p ON p.IdProducto = v.IdProducto
              WHERE v.IdProducto = @idProducto AND v.Activo = 1
              ORDER BY v.Stock DESC
            `);
        }

        // 3. Si no encontró por ID, buscar por similitud de nombre
        if (!stockCheck.recordset.length && nombrePrenda) {
          stockCheck = await new sql.Request(transaction)
            .input('nombrePrenda', sql.VarChar(150), `%${nombrePrenda}%`)
            .query(`
              SELECT TOP 1 v.IdVariante, v.IdProducto, v.Stock, v.Precio, v.Talla, v.Color, p.Nombre
              FROM producto_variantes v
              INNER JOIN productos p ON p.IdProducto = v.IdProducto
              WHERE p.Nombre LIKE @nombrePrenda AND v.Activo = 1
              ORDER BY v.Stock DESC
            `);
        }

        // 4. Si aún no encuentra, buscar en productos directo
        if (!stockCheck.recordset.length) {
          let prodCheck = { recordset: [] };
          if (idProducto && idProducto > 0) {
            prodCheck = await new sql.Request(transaction)
              .input('idProd', sql.Int, idProducto)
              .query('SELECT TOP 1 IdProducto, Nombre, Precio, Stock FROM productos WHERE IdProducto = @idProd');
          }
          if (!prodCheck.recordset.length && nombrePrenda) {
            prodCheck = await new sql.Request(transaction)
              .input('nombreProd', sql.VarChar(150), `%${nombrePrenda}%`)
              .query('SELECT TOP 1 IdProducto, Nombre, Precio, Stock FROM productos WHERE Nombre LIKE @nombreProd');
          }
          if (!prodCheck.recordset.length) {
            prodCheck = await new sql.Request(transaction)
              .query('SELECT TOP 1 IdProducto, Nombre, Precio, Stock FROM productos WHERE Stock > 0 ORDER BY IdProducto ASC');
          }

          const prod = prodCheck.recordset[0] || { IdProducto: 1, Nombre: 'Prenda NOVA', Precio: 89.00, Stock: 50 };
          const subtotalLinea = Number(prod.Precio) * cantidad;
          subtotalGeneral += subtotalLinea;
          detalleProcesado.push({
            idVariante: null,
            idProducto: prod.IdProducto,
            nombre: prod.Nombre,
            cantidad,
            precioUnitario: Number(prod.Precio),
            subtotal: subtotalLinea
          });
        } else {
          const varItem = stockCheck.recordset[0];
          const subtotalLinea = Number(varItem.Precio) * cantidad;
          subtotalGeneral += subtotalLinea;
          detalleProcesado.push({
            idVariante: varItem.IdVariante,
            idProducto: varItem.IdProducto,
            nombre: `${varItem.Nombre} (${varItem.Color} / ${varItem.Talla})`,
            cantidad,
            precioUnitario: Number(varItem.Precio),
            subtotal: subtotalLinea
          });
        }
      }

      // Buscar si el cliente ya existe en usuarios o registrar temporal
      let idUsuario = null;
      try {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
          if (decoded && decoded.sub) idUsuario = Number(decoded.sub);
        }
      } catch {
        idUsuario = null;
      }

      // Insertar Cabecera de Pedido
      const pedidoInsert = await new sql.Request(transaction)
        .input('idUsuario', sql.Int, idUsuario)
        .input('idMetodoPago', sql.Int, idMetodoPago)
        .input('estado', sql.VarChar(30), 'preparando')
        .input('subtotal', sql.Decimal(10, 2), subtotalGeneral)
        .input('total', sql.Decimal(10, 2), subtotalGeneral)
        .input('direccionEnvio', sql.VarChar(250), direccionEnvio)
        .query(`
          INSERT INTO pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
          OUTPUT INSERTED.IdPedido
          VALUES (@idUsuario, @idMetodoPago, @estado, @subtotal, 0.00, 0.00, @total, 'PEN', @direccionEnvio, SYSDATETIME())
        `);

      const idPedidoGenerado = pedidoInsert.recordset[0].IdPedido;

      // Insertar Detalles y Descontar Stock Real
      for (const linea of detalleProcesado) {
        if (linea.idVariante) {
          await new sql.Request(transaction)
            .input('idPedido', sql.Int, idPedidoGenerado)
            .input('idVariante', sql.Int, linea.idVariante)
            .input('idProducto', sql.Int, linea.idProducto)
            .input('cantidad', sql.Int, linea.cantidad)
            .input('precioUnitario', sql.Decimal(10, 2), linea.precioUnitario)
            .input('subtotal', sql.Decimal(10, 2), linea.subtotal)
            .query(`
              INSERT INTO pedido_detalle (IdPedido, IdVariante, Cantidad, PrecioUnitario, Subtotal)
              VALUES (@idPedido, @idVariante, @cantidad, @precioUnitario, @subtotal);

              UPDATE producto_variantes
              SET Stock = Stock - @cantidad
              WHERE IdVariante = @idVariante;

              UPDATE productos
              SET Stock = (SELECT ISNULL(SUM(Stock), 0) FROM producto_variantes WHERE IdProducto = @idProducto)
              WHERE IdProducto = @idProducto;
            `);
        } else {
          await new sql.Request(transaction)
            .input('idProducto', sql.Int, linea.idProducto)
            .input('cantidad', sql.Int, linea.cantidad)
            .query(`
              UPDATE productos
              SET Stock = Stock - @cantidad
              WHERE IdProducto = @idProducto;
            `);
        }
      }

      await transaction.commit();

      const entrega = new Date();
      entrega.setDate(entrega.getDate() + 3);

      const respuestaPedido = {
        id: idPedidoGenerado,
        cliente,
        direccionEnvio,
        metodoPago,
        items: detalleProcesado,
        total: subtotalGeneral,
        estado: 'Preparando',
        fecha: new Date().toISOString(),
        entregaEstimada: entrega.toISOString(),
      };

      pedidosMemoria.unshift(respuestaPedido);
      return res.status(201).json(respuestaPedido);

    } catch (sqlErr) {
      console.error('Error en transacción de compra SQL Server:', sqlErr);
      try { await transaction.rollback(); } catch {}
      // Continuar al fallback en memoria si la tabla no está creada
    }
  }

  // 2. Fallback de Almacenamiento en Memoria
  for (const item of items) {
    const productoId = Number(item.productoId ?? item.varianteId);
    const producto = productos.find(candidate => candidate.id === productoId);
    const cantidad = Number(item.cantidad);
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'El producto o la cantidad del pedido no son válidos.' });
    }
    const totalSolicitado = items
      .filter(linea => Number(linea.productoId ?? linea.varianteId) === productoId)
      .reduce((total, linea) => total + Number(linea.cantidad), 0);
    if (totalSolicitado > producto.stock) {
      return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}.` });
    }
  }

  const detalle = items.map(item => {
    const idProducto = Number(item.productoId ?? item.varianteId);
    const producto = productos.find(candidate => candidate.id === idProducto);
    const cantidad = Number(item.cantidad);
    return { productoId: producto.id, nombre: producto.nombre, cantidad, precio: producto.precio };
  });

  const total = detalle.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  detalle.forEach(item => {
    const producto = productos.find(candidate => candidate.id === item.productoId);
    producto.stock -= item.cantidad;
  });

  const entrega = new Date();
  entrega.setDate(entrega.getDate() + 3);
  const pedido = {
    id: siguientePedidoId++,
    cliente,
    direccionEnvio,
    metodoPago,
    items: detalle,
    total,
    estado: 'Preparando',
    fecha: new Date().toISOString(),
    entregaEstimada: entrega.toISOString(),
  };

  pedidosMemoria.unshift(pedido);
  res.status(201).json(pedido);
});

app.post('/login', async (req, res) => {
  const loginUsername = String(req.body.username || '').trim();
  const loginPassword = String(req.body.password || '');
  const key = `${req.ip}:${loginUsername.toLowerCase()}`;
  const attempt = failedAttempts.get(key);
  if (!loginUsername || !loginPassword) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  if (!JWT_SECRET) return res.status(503).json({ error: 'Autenticación no configurada' });
  if (attempt?.blockedUntil > Date.now()) return res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' });
  if (!pool) {
    const loginIdentifier = loginUsername.toLowerCase();
    const user = usuariosMemoria.find(item => item.usuario.toLowerCase() === loginIdentifier || item.correo.toLowerCase() === loginIdentifier);
    if (!user || !(await bcrypt.compare(loginPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    return res.json({
      token: jwt.sign({ sub: user.id, username: user.usuario, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' }),
      usuario: user.usuario,
      rol: user.rol,
    });
  }
  try {
    const fashionSchema = await pool.request().query("SELECT CASE WHEN COL_LENGTH('dbo.usuarios', 'Contrasena') IS NOT NULL THEN 1 ELSE 0 END AS enabled");
    if (fashionSchema.recordset[0].enabled === 1) {
      const result = await pool.request().input('username', sql.VarChar(255), loginUsername)
        .query('SELECT IdUsuario, Usuario, Correo, Contrasena, Rol FROM usuarios WHERE (LOWER(Correo) = LOWER(@username) OR LOWER(Usuario) = LOWER(@username) OR CAST(IdUsuario AS VARCHAR(20)) = @username) AND Activo = 1');
      const user = result.recordset[0];
      const valid = user && (String(user.Contrasena || '').startsWith('$2') ? await bcrypt.compare(loginPassword, user.Contrasena) : loginPassword === user.Contrasena);
      if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      failedAttempts.delete(key);
      const rol = user.Rol === 'administrador' || user.Rol === 'admin' ? 'admin' : 'cliente';
      return res.json({ token: jwt.sign({ sub: user.IdUsuario, username: user.Correo, rol }, JWT_SECRET, { expiresIn: '8h' }), usuario: user.Correo, rol });
    }
    const result = await pool.request().input('username', sql.VarChar(100), loginUsername)
      .query('SELECT IdUsuario, Usuario, PasswordHash FROM usuarios WHERE Usuario = @username AND Activo = 1');
    const user = result.recordset[0];
    const valid = user && await bcrypt.compare(loginPassword, user.PasswordHash);
    if (!valid) {
      const count = (attempt?.count || 0) + 1;
      failedAttempts.set(key, { count, blockedUntil: count >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    failedAttempts.delete(key);
    const rol = user.Usuario === 'admin' ? 'admin' : 'cliente';
    return res.json({ token: jwt.sign({ sub: user.IdUsuario, username: user.Usuario, rol }, JWT_SECRET, { expiresIn: '8h' }), usuario: user.Usuario, rol });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  return res.json({ ok: true, username, message: 'Login simulado correctamente' });
});

app.post('/recuperar-clave', async (req, res) => {
  const correo = String(req.body.correo || '').trim().toLowerCase();
  if (!correo) return res.status(400).json({ error: 'El correo es requerido' });
  if (!/^[^\s@]+@(gmail|hotmail)\.com$/i.test(correo)) return res.status(400).json({ error: 'Usa un correo @gmail.com o @hotmail.com.' });
  if (!pool) return res.status(503).json({ error: 'Autenticación no configurada' });
  try {
    const result = await pool.request().input('correo', sql.VarChar(255), correo)
      .query('SELECT IdUsuario FROM usuarios WHERE Correo = @correo AND Activo = 1');
    const user = result.recordset[0];
    if (user) {
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(recoveryToken).digest('hex');
      await pool.request().input('idUsuario', sql.Int, user.IdUsuario).input('tokenHash', sql.VarChar(64), tokenHash)
        .query('INSERT INTO tokens_recuperacion (IdUsuario, TokenHash, ExpiraEn) VALUES (@idUsuario, @tokenHash, DATEADD(HOUR, 1, SYSUTCDATETIME()))');
      // Envía recoveryToken por un proveedor de correo; nunca guardes ese valor en texto plano.
    }
    res.json({ ok: true, message: 'Si existe una cuenta asociada, recibirás instrucciones para recuperar el acceso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo procesar la solicitud' });
  }
});

// ─── Recomendaciones inteligentes de talla/estilo ──────────────────────────
// Reglas de inferencia equivalentes a logic-prolog/recomendador.pl
// Usadas directamente desde Node cuando Python no está disponible.

const REGLAS_TALLA = {
  mujer:   { XS:'Talla XS ideal para silueta delgada y altura petite.', S:'Talla S: ajuste slim, perfecto para looks elegantes y definidos.', M:'Talla M: balance perfecto entre comodidad y estilo.', L:'Talla L: holgura cómoda sin perder la silueta.', XL:'Talla XL: maximalismo con estilo, perfecta para looks oversize.' },
  hombre:  { XS:'Talla XS: corte entallado para silueta atlética y delgada.', S:'Talla S: ajuste clásico y versátil para cualquier ocasión.', M:'Talla M: la talla más popular, cómoda y estilizada.', L:'Talla L: espacio extra sin sacrificar el look.', XL:'Talla XL: ideal para complexión grande con estilo definido.' },
  unisex:  { XS:'Oversize XS: dramático y cómodo para estaturas bajas.', S:'Oversize S: equilibrio entre comodidad y proporciones visuales.', M:'Oversize M: la opción más versátil del catálogo NOVA.', L:'Oversize L: máxima comodidad, tendencia urbana.', XL:'Oversize XL: presencia visual máxima, tendencia streetwear.' },
};
const REGLAS_ESTILO = {
  'Prendas superiores': 'El negro es siempre una elección segura y elegante para el día a día.',
  'Vestidos':           'El vestido negro es un clásico atemporal para eventos nocturnos.',
  'Pantalones':         'El beige arena combina con prácticamente cualquier prenda superior.',
  'Calzado':            'El calzado blanco amplifica visualmente la silueta y aporta frescura.',
  'Sets':               'Los tonos pastel son ideales para looks coordenados y femeninos.',
  'Faldas':             'El terracota aporta calidez y es una de las apuestas de la temporada.',
};
const REGLAS_COMBINACION = {
  'Negro':        'Combina con pantalones beige, jeans claros o faldas blancas.',
  'Blanco hueso': 'Perfecto con jeans oscuros, pantalones camel o faldas negras.',
  'Verde oliva':  'Combina con pantalones beige, jeans straight o botines marrones.',
  'Beige arena':  'Combina con blusas blancas, tops negros o camisas de colores suaves.',
  'Terracota':    'Combina con blusas blancas, tops crema o chaquetas de lino natural.',
  'Rosado pastel':'El conjunto monocromático es tendencia; añade zapatillas blancas.',
  'Camel':        'El camel es neutro cálido; combina con negro, marfil o burdeos.',
  'Blanco':       'El blanco en calzado funciona con cualquier outfit y amplía visualmente.',
  'Indigo':       'Versátil: combina con camisetas básicas, blusas de seda o blazers.',
};

function normalizarGenero(genero = '') {
  const g = genero.toLowerCase().trim();
  if (['mujer', 'mujeres', 'female', 'f'].includes(g)) return 'mujer';
  if (['hombre', 'varones', 'male', 'm'].includes(g)) return 'hombre';
  if (['niña', 'niñas', 'girl'].includes(g)) return 'niña';
  if (['niño', 'niños', 'boy'].includes(g)) return 'niño';
  return 'unisex';
}

function obtenerRecomendacion(categoria, talla, color, genero) {
  const generoNorm = normalizarGenero(genero);
  const tablaGenero = generoNorm === 'mujer' || generoNorm === 'niña' ? 'mujer' : generoNorm === 'hombre' || generoNorm === 'niño' ? 'hombre' : 'unisex';
  const tallaUpper = (talla || 'M').toUpperCase();
  const consejoTalla = (REGLAS_TALLA[tablaGenero] || REGLAS_TALLA.unisex)[tallaUpper] || 'Elige la talla que mejor se adapte a tu cuerpo.';
  const consejoEstilo = REGLAS_ESTILO[categoria] || 'Elige el estilo que mejor exprese tu personalidad.';
  const combinacion = REGLAS_COMBINACION[color] || `El color ${color} combina con tonos neutros y complementarios.`;
  return { categoria, talla: tallaUpper, color, genero: generoNorm, consejo_talla: consejoTalla, consejo_estilo: consejoEstilo, combinacion, motor: 'Node.js (reglas Prolog mirror)', mensaje: consejoTalla };
}

app.get('/recomendaciones', (req, res) => {
  const { categoria = 'Prendas superiores', talla = 'M', color = 'Negro', genero = 'unisex' } = req.query;
  res.json(obtenerRecomendacion(String(categoria), String(talla), String(color), String(genero)));
});

app.post('/recomendaciones', (req, res) => {
  const { categoria = 'Prendas superiores', talla = 'M', color = 'Negro', genero = 'unisex' } = req.body || {};
  res.json(obtenerRecomendacion(String(categoria), String(talla), String(color), String(genero)));
});

async function startServer() {
  if (!JWT_SECRET) throw new Error('JWT_SECRET no está configurado en .env');
  if (pool) {
    try {
      await pool.connect();
      await ensureDatabase();
    } catch (error) {
      console.error('No se pudo conectar con SQL Server. Se usará almacenamiento local:', error.message);
      pool = null;
    }
  }

  app.listen(PORT, () => {
    console.log(`Backend escuchando en http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
