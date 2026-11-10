-- =====================================================================
-- BASE DE DATOS COMPLETA PARA MICROSOFT SQL SERVER: TiendaRopa
-- Proyecto: Sistema de Gestión de Ventas / Ecommerce de Ropa
-- Unificado: database-TiendaRopa.sql + migraciones + server.js
-- Corregido: Sin ciclos de cascada (Multiple Cascade Paths resuelto)
-- =====================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TiendaRopa')
BEGIN
    CREATE DATABASE [TiendaRopa];
END
GO

USE [TiendaRopa];
GO

-- Limpieza previa para recreación completa y limpia
IF OBJECT_ID('dbo.tokens_recuperacion', 'U') IS NOT NULL DROP TABLE dbo.tokens_recuperacion;
IF OBJECT_ID('dbo.direcciones', 'U') IS NOT NULL DROP TABLE dbo.direcciones;
IF OBJECT_ID('dbo.carrito', 'U') IS NOT NULL DROP TABLE dbo.carrito;
IF OBJECT_ID('dbo.pedido_detalle', 'U') IS NOT NULL DROP TABLE dbo.pedido_detalle;
IF OBJECT_ID('dbo.pedidos', 'U') IS NOT NULL DROP TABLE dbo.pedidos;
IF OBJECT_ID('dbo.ProductoImagenes', 'U') IS NOT NULL DROP TABLE dbo.ProductoImagenes;
IF OBJECT_ID('dbo.producto_variantes', 'U') IS NOT NULL DROP TABLE dbo.producto_variantes;
IF OBJECT_ID('dbo.productos', 'U') IS NOT NULL DROP TABLE dbo.productos;
IF OBJECT_ID('dbo.metodos_pago', 'U') IS NOT NULL DROP TABLE dbo.metodos_pago;
IF OBJECT_ID('dbo.categorias', 'U') IS NOT NULL DROP TABLE dbo.categorias;
IF OBJECT_ID('dbo.usuarios', 'U') IS NOT NULL DROP TABLE dbo.usuarios;
GO

-- =====================================================================
-- 1. TABLA: categorias
-- =====================================================================
CREATE TABLE dbo.categorias (
    IdCategoria INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE,
    Slug VARCHAR(120) NOT NULL UNIQUE,
    Descripcion VARCHAR(300) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_categorias_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_categorias_CreadoEn DEFAULT SYSDATETIME()
);
GO

-- =====================================================================
-- 2. TABLA: usuarios
-- =====================================================================
CREATE TABLE dbo.usuarios (
    IdUsuario INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Usuario VARCHAR(100) NULL,
    Nombre VARCHAR(100) NOT NULL,
    Apellido VARCHAR(100) NOT NULL,
    Correo VARCHAR(150) NOT NULL UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    PasswordHash VARCHAR(255) NULL,
    Rol VARCHAR(30) NOT NULL CONSTRAINT DF_usuarios_Rol DEFAULT 'cliente',
    Telefono VARCHAR(20) NULL,
    Direccion VARCHAR(250) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_usuarios_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_usuarios_CreadoEn DEFAULT SYSDATETIME(),
    CONSTRAINT CK_usuarios_rol CHECK (Rol IN ('vendedor', 'administrador', 'cliente', 'admin'))
);
GO

CREATE UNIQUE INDEX UX_usuarios_Usuario ON dbo.usuarios (Usuario) WHERE Usuario IS NOT NULL;
GO

-- =====================================================================
-- 3. TABLA: productos
-- =====================================================================
CREATE TABLE dbo.productos (
    IdProducto INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdCategoria INT NOT NULL,
    Nombre VARCHAR(150) NOT NULL,
    Slug VARCHAR(180) NOT NULL,
    Descripcion VARCHAR(500) NULL,
    Genero VARCHAR(30) NOT NULL CONSTRAINT DF_productos_Genero DEFAULT 'unisex',
    Marca VARCHAR(100) NULL CONSTRAINT DF_productos_Marca DEFAULT 'NOVA',
    Imagen VARCHAR(500) NULL,
    Precio DECIMAL(10,2) NULL,
    Stock INT NULL CONSTRAINT DF_productos_Stock DEFAULT 0,
    Categoria VARCHAR(100) NULL,
    SKU VARCHAR(50) NULL,
    Talla VARCHAR(20) NULL,
    Color VARCHAR(100) NULL,
    Activo BIT NOT NULL CONSTRAINT DF_productos_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_productos_CreadoEn DEFAULT SYSDATETIME(),
    CONSTRAINT FK_productos_categorias FOREIGN KEY (IdCategoria) REFERENCES dbo.categorias (IdCategoria)
);
GO

-- =====================================================================
-- 4. TABLA: producto_variantes
-- =====================================================================
CREATE TABLE dbo.producto_variantes (
    IdVariante INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdProducto INT NOT NULL,
    Talla VARCHAR(20) NOT NULL,
    Color VARCHAR(50) NOT NULL,
    Stock INT NOT NULL CONSTRAINT DF_variantes_Stock DEFAULT 0,
    Precio DECIMAL(10,2) NOT NULL CONSTRAINT DF_variantes_Precio DEFAULT 0.00,
    CodigoSKU VARCHAR(50) NOT NULL,
    Activo BIT NOT NULL CONSTRAINT DF_variantes_Activo DEFAULT 1,
    CONSTRAINT CK_variantes_stock CHECK (Stock >= 0),
    CONSTRAINT CK_variantes_precio CHECK (Precio >= 0),
    CONSTRAINT FK_variantes_productos FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto) ON DELETE CASCADE
);
GO

CREATE INDEX IX_producto_variantes_producto_talla_color 
ON dbo.producto_variantes (IdProducto, Talla, Color);
GO

-- =====================================================================
-- 5. TABLA: ProductoImagenes (Sin ciclos de cascada)
-- =====================================================================
CREATE TABLE dbo.ProductoImagenes (
    IdImagen INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdProducto INT NOT NULL,
    IdVariante INT NULL,
    Url VARCHAR(500) NOT NULL,
    TextoAlternativo VARCHAR(180) NULL,
    Orden INT NOT NULL CONSTRAINT DF_ProductoImagenes_Orden DEFAULT 0,
    Activo BIT NOT NULL CONSTRAINT DF_ProductoImagenes_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_ProductoImagenes_CreadoEn DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ProductoImagenes_Producto FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto) ON DELETE CASCADE,
    CONSTRAINT FK_ProductoImagenes_Variante FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- 6. TABLA: metodos_pago
-- =====================================================================
CREATE TABLE dbo.metodos_pago (
    IdMetodoPago INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Nombre VARCHAR(80) NOT NULL UNIQUE,
    Activo BIT NOT NULL CONSTRAINT DF_metodos_pago_activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_metodos_pago_creado DEFAULT SYSDATETIME()
);
GO

-- =====================================================================
-- 7. TABLA: pedidos
-- =====================================================================
CREATE TABLE dbo.pedidos (
    IdPedido INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdUsuario INT NULL,
    IdMetodoPago INT NULL,
    Estado VARCHAR(30) NOT NULL CONSTRAINT DF_pedidos_Estado DEFAULT 'pendiente',
    Subtotal DECIMAL(10,2) NOT NULL CONSTRAINT DF_pedidos_Subtotal DEFAULT 0,
    Descuento DECIMAL(10,2) NOT NULL CONSTRAINT DF_pedidos_Descuento DEFAULT 0,
    Envio DECIMAL(10,2) NOT NULL CONSTRAINT DF_pedidos_Envio DEFAULT 0,
    Total DECIMAL(10,2) NOT NULL CONSTRAINT DF_pedidos_Total DEFAULT 0,
    Moneda CHAR(3) NOT NULL CONSTRAINT DF_pedidos_Moneda DEFAULT 'PEN',
    DireccionEnvio VARCHAR(250) NULL,
    FechaPedido DATETIME2 NOT NULL CONSTRAINT DF_pedidos_FechaPedido DEFAULT SYSDATETIME(),
    CONSTRAINT CK_pedidos_descuento CHECK (Descuento >= 0),
    CONSTRAINT CK_pedidos_envio CHECK (Envio >= 0),
    CONSTRAINT CK_pedidos_subtotal CHECK (Subtotal >= 0),
    CONSTRAINT CK_pedidos_total CHECK (Total >= 0),
    CONSTRAINT FK_pedidos_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario) ON DELETE SET NULL,
    CONSTRAINT FK_pedidos_metodos_pago FOREIGN KEY (IdMetodoPago) REFERENCES dbo.metodos_pago (IdMetodoPago) ON DELETE SET NULL
);
GO

CREATE INDEX IX_pedidos_usuario_fecha 
ON dbo.pedidos (IdUsuario, FechaPedido DESC);
GO

-- =====================================================================
-- 8. TABLA: pedido_detalle
-- =====================================================================
CREATE TABLE dbo.pedido_detalle (
    IdDetalle INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdPedido INT NOT NULL,
    IdVariante INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT CK_detalle_cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_detalle_precio CHECK (PrecioUnitario >= 0),
    CONSTRAINT CK_detalle_subtotal CHECK (Subtotal >= 0),
    CONSTRAINT FK_detalle_pedidos FOREIGN KEY (IdPedido) REFERENCES dbo.pedidos (IdPedido) ON DELETE CASCADE,
    CONSTRAINT FK_detalle_variantes FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante) ON DELETE NO ACTION
);
GO

-- =====================================================================
-- 9. TABLA: carrito
-- =====================================================================
CREATE TABLE dbo.carrito (
    IdCarrito INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdUsuario INT NOT NULL,
    IdVariante INT NOT NULL,
    Cantidad INT NOT NULL CONSTRAINT DF_carrito_cantidad DEFAULT 1,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_carrito_creado DEFAULT SYSDATETIME(),
    CONSTRAINT CK_carrito_cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_carrito_precio CHECK (PrecioUnitario >= 0),
    CONSTRAINT FK_carrito_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario) ON DELETE CASCADE,
    CONSTRAINT FK_carrito_variantes FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante) ON DELETE NO ACTION
);
GO

CREATE INDEX IX_carrito_usuario 
ON dbo.carrito (IdUsuario, IdVariante);
GO

-- =====================================================================
-- 10. TABLA: direcciones
-- =====================================================================
CREATE TABLE dbo.direcciones (
    IdDireccion INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdUsuario INT NOT NULL,
    NombreContacto VARCHAR(100) NOT NULL,
    Telefono VARCHAR(20) NULL,
    Departamento VARCHAR(80) NULL,
    Provincia VARCHAR(80) NULL,
    Distrito VARCHAR(80) NULL,
    Direccion VARCHAR(250) NOT NULL,
    Referencia VARCHAR(200) NULL,
    Predeterminada BIT NOT NULL CONSTRAINT DF_direcciones_predeterminada DEFAULT 0,
    Activo BIT NOT NULL CONSTRAINT DF_direcciones_activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_direcciones_creado DEFAULT SYSDATETIME(),
    CONSTRAINT FK_direcciones_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario) ON DELETE CASCADE
);
GO

-- =====================================================================
-- 11. TABLA: tokens_recuperacion
-- =====================================================================
CREATE TABLE dbo.tokens_recuperacion (
    IdToken INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    IdUsuario INT NOT NULL,
    TokenHash VARCHAR(64) NOT NULL,
    ExpiraEn DATETIME2 NOT NULL,
    UsadoEn DATETIME2 NULL,
    CONSTRAINT FK_tokens_recuperacion_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario) ON DELETE CASCADE
);
GO

-- =====================================================================
-- INSERCIÓN DE DATOS INICIALES (SEMILLAS / SEED DATA)
-- =====================================================================

-- Métodos de pago
SET IDENTITY_INSERT dbo.metodos_pago ON;
INSERT INTO dbo.metodos_pago (IdMetodoPago, Nombre, Activo) VALUES
(1, 'Yape', 1),
(2, 'Plin', 1),
(3, 'Tarjeta', 1),
(4, 'Transferencia', 1),
(5, 'Efectivo', 1);
SET IDENTITY_INSERT dbo.metodos_pago OFF;
GO

-- Categorías
SET IDENTITY_INSERT dbo.categorias ON;
INSERT INTO dbo.categorias (IdCategoria, Nombre, Slug, Descripcion, Activo) VALUES
(1, 'Prendas superiores', 'prendas-superiores', 'Polos, blusas, camisetas y blazers', 1),
(2, 'Vestidos', 'vestidos', 'Vestidos formales, de noche y casuales', 1),
(3, 'Pantalones', 'pantalones', 'Jeans, pantalones de vestir y joggers', 1),
(4, 'Calzado', 'calzado', 'Zapatillas urbanas, botines y calzado cómodo', 1),
(5, 'Sets', 'sets', 'Conjuntos de moda y outfits coordinados', 1),
(6, 'Faldas', 'faldas', 'Faldas midi, mini y de lino', 1),
(7, 'Accesorios', 'accesorios', 'Complementos para todo tipo de ocasión', 1),
(8, 'Novedades', 'novedades', 'Últimos lanzamientos y tendencias', 1);
SET IDENTITY_INSERT dbo.categorias OFF;
GO

-- Usuarios iniciales (Admin y Cliente) - Clave por defecto: 1234
SET IDENTITY_INSERT dbo.usuarios ON;
INSERT INTO dbo.usuarios (IdUsuario, Usuario, Nombre, Apellido, Correo, Contrasena, PasswordHash, Rol, Telefono, Direccion, Activo) VALUES
(1, 'admin', 'Administrador', 'Nova', 'admin@tiendaropa.com', '1234', '1234', 'admin', '999888777', 'Av. Principal 123', 1),
(2, 'cliente', 'Juan', 'Perez', 'cliente@tiendaropa.com', '1234', '1234', 'cliente', '987654321', 'Av. Las Flores 456', 1);
SET IDENTITY_INSERT dbo.usuarios OFF;
GO

-- Catálogo de productos
SET IDENTITY_INSERT dbo.productos ON;
INSERT INTO dbo.productos (IdProducto, IdCategoria, Nombre, Slug, Descripcion, Genero, Marca, Imagen, Precio, Stock, Categoria, SKU, Talla, Color, Activo) VALUES
(1, 1, 'Blazer oversize', 'blazer-oversize', 'Blazer oversize confeccionado con tela estructurada y caída moderna.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=80', 189.00, 18, 'Prendas superiores', 'NOV-BLZ-001', 'M', 'Negro carbón', 1),
(2, 2, 'Vestido satén midi', 'vestido-saten-midi', 'Vestido satín elegante de corte midi ideal para eventos y cenas.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=500&q=80', 229.00, 7, 'Vestidos', 'NOV-VES-002', 'S', 'Verde oliva', 1),
(3, 3, 'Pantalón wide leg', 'pantalon-wide-leg', 'Pantalón de pierna ancha tiro alto en tono neutro combinable.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1506629905607-d9c297d4a5c5?auto=format&fit=crop&w=500&q=80', 149.00, 24, 'Pantalones', 'NOV-PAN-003', 'L', 'Beige arena', 1),
(4, 4, 'Zapatillas street', 'zapatillas-street', 'Zapatillas urbanas de suela amortiguada para uso diario.', 'varones', 'NOVA', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85', 159.00, 15, 'Calzado', 'NOV-ZAP-004', '42', 'Blanco', 1),
(5, 1, 'Sudadera arcoíris', 'sudadera-arcoiris', 'Sudadera infantil abrigadora con diseño juvenil y suave algodón.', 'niñas', 'NOVA', 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=700&q=85', 99.00, 12, 'Prendas superiores', 'NOV-SUD-005', '10', 'Lavanda', 1),
(6, 1, 'Polo esencial', 'polo-esencial', 'Polo infantil fresco de algodón peruano hipoalergénico.', 'niños', 'NOVA', 'https://images.unsplash.com/photo-1519238263530-99bad5d7d3a0?auto=format&fit=crop&w=700&q=85', 69.00, 20, 'Prendas superiores', 'NOV-POL-006', '12', 'Azul cielo', 1),
(7, 1, 'Camiseta premium', 'camiseta-premium', 'Camiseta para hombre de corte regular fit en algodón peinado.', 'varones', 'NOVA', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80', 89.00, 26, 'Prendas superiores', 'NOV-CAM-007', 'M', 'Blanco hueso', 1),
(8, 1, 'Chaqueta bomber', 'chaqueta-bomber', 'Chaqueta bomber ligera con cierres reforzados y acabado premium.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=80', 219.00, 11, 'Prendas superiores', 'NOV-CHA-008', 'L', 'Caqui', 1),
(9, 3, 'Jean straight fit', 'jean-straight-fit', 'Pantalón jean clásico de corte recto en mezclilla de alta durabilidad.', 'varones', 'NOVA', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=80', 169.00, 13, 'Pantalones', 'NOV-JEN-009', '32', 'Indigo', 1),
(10, 1, 'Top de encaje', 'top-de-encaje', 'Top femenino delicado con detalle de encaje floral.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80', 95.00, 16, 'Prendas superiores', 'NOV-SHL-010', 'S', 'Blanco marfil', 1),
(11, 5, 'Conjunto deportivo', 'conjunto-deportivo', 'Conjunto infantil de 2 piezas transpirable para actividades deportivas.', 'niñas', 'NOVA', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=500&q=80', 179.00, 9, 'Sets', 'NOV-SET-011', '8', 'Rosado pastel', 1),
(12, 6, 'Skirt de lino', 'skirt-de-lino', 'Falda de lino fresca con botones frontales decorativos.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80', 129.00, 14, 'Faldas', 'NOV-SKI-012', 'M', 'Terracota', 1),
(13, 1, 'Coat minimal', 'coat-minimal', 'Abrigo largo de corte limpio y minimalista para temporada fría.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=500&q=80', 249.00, 8, 'Prendas superiores', 'NOV-COA-013', 'XL', 'Camel', 1),
(14, 4, 'Botines premium', 'botines-premium', 'Botines de cuero con taco cómodo para eventos casuales y formales.', 'mujeres', 'NOVA', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85', 199.00, 15, 'Calzado', 'NOV-BOT-014', '39', 'Marrón', 1);
SET IDENTITY_INSERT dbo.productos OFF;
GO

-- Variantes de productos (Talla, Color, Stock, Precio, SKU)
SET IDENTITY_INSERT dbo.producto_variantes ON;
INSERT INTO dbo.producto_variantes (IdVariante, IdProducto, Talla, Color, Stock, Precio, CodigoSKU, Activo) VALUES
(1, 1, 'M', 'Negro carbón', 18, 189.00, 'NOV-BLZ-001', 1),
(2, 2, 'S', 'Verde oliva', 7, 229.00, 'NOV-VES-002', 1),
(3, 3, 'L', 'Beige arena', 24, 149.00, 'NOV-PAN-003', 1),
(4, 4, '42', 'Blanco', 15, 159.00, 'NOV-ZAP-004', 1),
(5, 5, '10', 'Lavanda', 12, 99.00, 'NOV-SUD-005', 1),
(6, 6, '12', 'Azul cielo', 20, 69.00, 'NOV-POL-006', 1),
(7, 7, 'M', 'Blanco hueso', 26, 89.00, 'NOV-CAM-007', 1),
(8, 8, 'L', 'Caqui', 11, 219.00, 'NOV-CHA-008', 1),
(9, 9, '32', 'Indigo', 13, 169.00, 'NOV-JEN-009', 1),
(10, 10, 'S', 'Blanco marfil', 16, 95.00, 'NOV-SHL-010', 1),
(11, 11, '8', 'Rosado pastel', 9, 179.00, 'NOV-SET-011', 1),
(12, 12, 'M', 'Terracota', 14, 129.00, 'NOV-SKI-012', 1),
(13, 13, 'XL', 'Camel', 8, 249.00, 'NOV-COA-013', 1),
(14, 14, '39', 'Marrón', 15, 199.00, 'NOV-BOT-014', 1);
SET IDENTITY_INSERT dbo.producto_variantes OFF;
GO

-- Galería de imágenes vinculada a productos
INSERT INTO dbo.ProductoImagenes (IdProducto, IdVariante, Url, TextoAlternativo, Orden, Activo)
SELECT p.IdProducto, pv.IdVariante, p.Imagen, p.Nombre, 0, 1
FROM dbo.productos p
INNER JOIN dbo.producto_variantes pv ON pv.IdProducto = p.IdProducto;
GO
