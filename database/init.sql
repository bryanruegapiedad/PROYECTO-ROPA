-- ============================================================================
-- PROYECTO TIENDA DE ROPA (NOVA STUDIO)
-- SCRIPT COMPLETO DE BASE DE DATOS PARA SQL SERVER
-- ============================================================================
-- Diseñado para que cualquier desarrollador clone el repositorio y con solo
-- ejecutar este script tenga la base de datos completa con:
--   1. Estructura de tablas e índices normalizados.
--   2. Usuarios creados: 'admin' (1234) y 'cliente' (1234).
--   3. Métodos de pago (Yape, Plin, Tarjeta, Transferencia, Efectivo).
--   4. Categorías de moda boutique.
--   5. Catálogo completo de prendas con fotos reales en alta resolución.
--   6. Variantes con tallas, colores, precios y stock disponible.
--   7. Pedidos históricos para que el panel de administración (/dashboard)
--      muestre métricas financieras, gráficos y ranking de ventas de inmediato.
-- ============================================================================

IF DB_ID(N'TiendaRopa') IS NULL
BEGIN
    PRINT 'Creando base de datos TiendaRopa...';
    CREATE DATABASE TiendaRopa;
END
GO

USE TiendaRopa;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ----------------------------------------------------------------------------
-- 1. TABLA CATEGORIAS
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.categorias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.categorias (
        IdCategoria INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_categorias PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL
            CONSTRAINT UQ_categorias_Nombre UNIQUE,
        Slug NVARCHAR(120) NOT NULL
            CONSTRAINT UQ_categorias_Slug UNIQUE,
        Descripcion NVARCHAR(300) NULL,
        Activo BIT NOT NULL
            CONSTRAINT DF_categorias_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_categorias_CreadoEn DEFAULT SYSDATETIME()
    );
END
GO

-- ----------------------------------------------------------------------------
-- 2. TABLA USUARIOS
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios (
        IdUsuario INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_usuarios PRIMARY KEY,
        Usuario VARCHAR(100) NULL,
        Nombre NVARCHAR(100) NOT NULL,
        Apellido NVARCHAR(100) NOT NULL,
        Correo VARCHAR(150) NOT NULL
            CONSTRAINT UQ_usuarios_Correo UNIQUE,
        Contrasena VARCHAR(255) NOT NULL,
        PasswordHash VARCHAR(255) NULL,
        Rol VARCHAR(30) NOT NULL
            CONSTRAINT DF_usuarios_Rol DEFAULT 'cliente',
        Telefono VARCHAR(20) NULL,
        Direccion NVARCHAR(250) NULL,
        Activo BIT NOT NULL
            CONSTRAINT DF_usuarios_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_usuarios_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT CK_usuarios_Rol
            CHECK (Rol IN ('cliente', 'administrador', 'admin', 'vendedor'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'UX_usuarios_Usuario')
BEGIN
    CREATE UNIQUE INDEX UX_usuarios_Usuario
        ON dbo.usuarios (Usuario)
        WHERE Usuario IS NOT NULL;
END
GO

-- ----------------------------------------------------------------------------
-- 3. TABLA PRODUCTOS
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.productos (
        IdProducto INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_productos PRIMARY KEY,
        IdCategoria INT NOT NULL,
        Nombre NVARCHAR(150) NOT NULL,
        Slug NVARCHAR(180) NOT NULL
            CONSTRAINT UQ_productos_Slug UNIQUE,
        Descripcion NVARCHAR(500) NULL,
        Genero NVARCHAR(30) NOT NULL,
        Marca NVARCHAR(100) NULL,
        Imagen NVARCHAR(500) NULL,
        Activo BIT NOT NULL
            CONSTRAINT DF_productos_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_productos_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT CK_productos_Genero
            CHECK (Genero IN (N'hombre', N'mujer', N'unisex', N'niño', N'niña', N'mujeres', N'varones', N'niños', N'niñas')),
        CONSTRAINT FK_productos_categorias
            FOREIGN KEY (IdCategoria) REFERENCES dbo.categorias (IdCategoria)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 4. TABLA PRODUCTO_VARIANTES
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.producto_variantes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.producto_variantes (
        IdVariante INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_producto_variantes PRIMARY KEY,
        IdProducto INT NOT NULL,
        Talla NVARCHAR(20) NOT NULL,
        Color NVARCHAR(50) NOT NULL,
        Stock INT NOT NULL
            CONSTRAINT DF_variantes_Stock DEFAULT 0,
        Precio DECIMAL(10,2) NOT NULL,
        CodigoSKU VARCHAR(50) NOT NULL
            CONSTRAINT UQ_variantes_CodigoSKU UNIQUE,
        Activo BIT NOT NULL
            CONSTRAINT DF_variantes_Activo DEFAULT 1,
        CONSTRAINT CK_variantes_Stock CHECK (Stock >= 0),
        CONSTRAINT CK_variantes_Precio CHECK (Precio >= 0),
        CONSTRAINT UQ_variantes_Producto_Talla_Color
            UNIQUE (IdProducto, Talla, Color),
        CONSTRAINT FK_variantes_productos
            FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 5. TABLA PRODUCTO_IMAGENES
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ProductoImagenes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductoImagenes (
        IdImagen INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_ProductoImagenes PRIMARY KEY,
        IdProducto INT NOT NULL,
        IdVariante INT NULL,
        Url NVARCHAR(500) NOT NULL,
        TextoAlternativo NVARCHAR(180) NULL,
        Orden INT NOT NULL
            CONSTRAINT DF_ProductoImagenes_Orden DEFAULT 0,
        Activo BIT NOT NULL
            CONSTRAINT DF_ProductoImagenes_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_ProductoImagenes_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT FK_ProductoImagenes_Producto
            FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto),
        CONSTRAINT FK_ProductoImagenes_Variante
            FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 6. TABLA METODOS_PAGO
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.metodos_pago', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.metodos_pago (
        IdMetodoPago INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_metodos_pago PRIMARY KEY,
        Nombre NVARCHAR(80) NOT NULL
            CONSTRAINT UQ_metodos_pago_Nombre UNIQUE,
        Activo BIT NOT NULL
            CONSTRAINT DF_metodos_pago_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_metodos_pago_CreadoEn DEFAULT SYSDATETIME()
    );
END
GO

-- ----------------------------------------------------------------------------
-- 7. TABLA DIRECCIONES
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.direcciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.direcciones (
        IdDireccion INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_direcciones PRIMARY KEY,
        IdUsuario INT NOT NULL,
        NombreContacto NVARCHAR(100) NOT NULL,
        Telefono VARCHAR(20) NULL,
        Departamento NVARCHAR(80) NULL,
        Provincia NVARCHAR(80) NULL,
        Distrito NVARCHAR(80) NULL,
        Direccion NVARCHAR(250) NOT NULL,
        Referencia NVARCHAR(200) NULL,
        Predeterminada BIT NOT NULL
            CONSTRAINT DF_direcciones_Predeterminada DEFAULT 0,
        Activo BIT NOT NULL
            CONSTRAINT DF_direcciones_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_direcciones_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT FK_direcciones_usuarios
            FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 8. TABLA PEDIDOS
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.pedidos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pedidos (
        IdPedido INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_pedidos PRIMARY KEY,
        IdUsuario INT NULL,
        IdMetodoPago INT NULL,
        Estado VARCHAR(30) NOT NULL
            CONSTRAINT DF_pedidos_Estado DEFAULT 'pendiente',
        Subtotal DECIMAL(10,2) NOT NULL
            CONSTRAINT DF_pedidos_Subtotal DEFAULT 0,
        Descuento DECIMAL(10,2) NOT NULL
            CONSTRAINT DF_pedidos_Descuento DEFAULT 0,
        Envio DECIMAL(10,2) NOT NULL
            CONSTRAINT DF_pedidos_Envio DEFAULT 0,
        Total DECIMAL(10,2) NOT NULL
            CONSTRAINT DF_pedidos_Total DEFAULT 0,
        Moneda CHAR(3) NOT NULL
            CONSTRAINT DF_pedidos_Moneda DEFAULT 'PEN',
        DireccionEnvio NVARCHAR(250) NULL,
        FechaPedido DATETIME2 NOT NULL
            CONSTRAINT DF_pedidos_FechaPedido DEFAULT SYSDATETIME(),
        CONSTRAINT CK_pedidos_Estado
            CHECK (Estado IN ('pendiente', 'pagado', 'preparando',
                              'enviado', 'entregado', 'cancelado')),
        CONSTRAINT CK_pedidos_Subtotal CHECK (Subtotal >= 0),
        CONSTRAINT CK_pedidos_Descuento CHECK (Descuento >= 0),
        CONSTRAINT CK_pedidos_Envio CHECK (Envio >= 0),
        CONSTRAINT CK_pedidos_Total CHECK (Total >= 0),
        CONSTRAINT FK_pedidos_usuarios
            FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario),
        CONSTRAINT FK_pedidos_metodos_pago
            FOREIGN KEY (IdMetodoPago) REFERENCES dbo.metodos_pago (IdMetodoPago)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 9. TABLA PEDIDO_DETALLE
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.pedido_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pedido_detalle (
        IdDetalle INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_pedido_detalle PRIMARY KEY,
        IdPedido INT NOT NULL,
        IdVariante INT NOT NULL,
        Cantidad INT NOT NULL,
        PrecioUnitario DECIMAL(10,2) NOT NULL,
        Subtotal DECIMAL(10,2) NOT NULL,
        CONSTRAINT CK_detalle_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_detalle_Precio CHECK (PrecioUnitario >= 0),
        CONSTRAINT CK_detalle_Subtotal CHECK (Subtotal >= 0),
        CONSTRAINT FK_detalle_pedidos
            FOREIGN KEY (IdPedido) REFERENCES dbo.pedidos (IdPedido),
        CONSTRAINT FK_detalle_variantes
            FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 10. TABLA CARRITO
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.carrito', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.carrito (
        IdCarrito INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_carrito PRIMARY KEY,
        IdUsuario INT NOT NULL,
        IdVariante INT NOT NULL,
        Cantidad INT NOT NULL
            CONSTRAINT DF_carrito_Cantidad DEFAULT 1,
        PrecioUnitario DECIMAL(10,2) NOT NULL,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_carrito_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT CK_carrito_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_carrito_Precio CHECK (PrecioUnitario >= 0),
        CONSTRAINT UQ_carrito_Usuario_Variante UNIQUE (IdUsuario, IdVariante),
        CONSTRAINT FK_carrito_usuarios
            FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario),
        CONSTRAINT FK_carrito_variantes
            FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 11. TABLA TOKENS_RECUPERACION
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.tokens_recuperacion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tokens_recuperacion (
        IdToken INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_tokens_recuperacion PRIMARY KEY,
        IdUsuario INT NOT NULL,
        TokenHash VARCHAR(64) NOT NULL,
        ExpiraEn DATETIME2 NOT NULL,
        Usado BIT NOT NULL
            CONSTRAINT DF_tokens_recuperacion_Usado DEFAULT 0,
        CreadoEn DATETIME2 NOT NULL
            CONSTRAINT DF_tokens_recuperacion_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT FK_tokens_recuperacion_usuarios
            FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario)
    );
END
GO

-- ----------------------------------------------------------------------------
-- INDICES PARA OPTIMIZAR CONSULTAS
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.producto_variantes') AND name = 'IX_variantes_Producto_Talla_Color')
BEGIN
    CREATE INDEX IX_variantes_Producto_Talla_Color
        ON dbo.producto_variantes (IdProducto, Talla, Color)
        INCLUDE (Stock, Precio, Activo);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.pedidos') AND name = 'IX_pedidos_Usuario_Fecha')
BEGIN
    CREATE INDEX IX_pedidos_Usuario_Fecha
        ON dbo.pedidos (IdUsuario, FechaPedido DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.ProductoImagenes') AND name = 'IX_ProductoImagenes_Producto_Orden')
BEGIN
    CREATE INDEX IX_ProductoImagenes_Producto_Orden
        ON dbo.ProductoImagenes (IdProducto, Orden);
END
GO

-- ============================================================================
-- CARGA DE DATOS SEMILLA (SEED DATA)
-- ============================================================================

-- A. CATEGORIAS DE MODA BOUTIQUE
INSERT INTO dbo.categorias (Nombre, Slug, Descripcion)
SELECT v.Nombre, v.Slug, v.Descripcion
FROM (VALUES
    (N'Prendas superiores', N'prendas-superiores', N'Blazers, chaquetas, tops y camisas de corte refinado'),
    (N'Vestidos', N'vestidos', N'Vestidos para eventos especiales, noche y estilo casual chic'),
    (N'Pantalones', N'pantalones', N'Pantalones wide leg, formales y denim premium'),
    (N'Calzado', N'calzado', N'Zapatillas urbanas, tacones y botines de cuero'),
    (N'Sets', N'sets', N'Conjuntos coordinados de moda y athleisure'),
    (N'Faldas', N'faldas', N'Faldas midi, de lino y siluetas contemporaneas'),
    (N'Polos', N'polos', N'Polos esenciales de algodon pima peruano'),
    (N'Casacas', N'casacas', N'Casacas acolchadas y prendas de abrigo para exteriores'),
    (N'Poleras', N'poleras', N'Sudaderas suaves con y sin capucha'),
    (N'Camisas', N'camisas', N'Camisas formales y casuales con corte regular y slim'),
    (N'Blusas', N'blusas', N'Blusas sofisticadas de seda y algodon'),
    (N'Zapatillas', N'zapatillas', N'Calzado deportivo y urbano contemporaneo'),
    (N'Accesorios', N'accesorios', N'Complementos, bolsos y joyeria de diseno'),
    (N'Novedades', N'novedades', N'Ultimos lanzamientos y drops exclusivos de la temporada')
) AS v(Nombre, Slug, Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.categorias c WHERE c.Slug = v.Slug);
GO

-- B. METODOS DE PAGO
INSERT INTO dbo.metodos_pago (Nombre)
SELECT v.Nombre
FROM (VALUES
    (N'Yape'),
    (N'Plin'),
    (N'Tarjeta de Credito / Debito'),
    (N'Transferencia Bancaria'),
    (N'Efectivo contra entrega')
) AS v(Nombre)
WHERE NOT EXISTS (SELECT 1 FROM dbo.metodos_pago m WHERE m.Nombre = v.Nombre);
GO

-- C. USUARIOS (admin / 1234 y cliente / 1234)
IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE Usuario = 'admin' OR Correo = 'admin@nova.com')
BEGIN
    INSERT INTO dbo.usuarios (Usuario, Nombre, Apellido, Correo, Contrasena, PasswordHash, Rol, Telefono, Direccion, Activo)
    VALUES ('admin', N'Administrador', N'Sistema', 'admin@nova.com', '1234', '/IFreJMWloZBcxBE74u0CFltzHIBFFAjWm3tSkXXhrERav1zDq', 'administrador', '999888777', N'Av. Javier Prado Este 4500, Lima', 1);
END
ELSE
BEGIN
    UPDATE dbo.usuarios 
    SET Contrasena = '1234', PasswordHash = '/IFreJMWloZBcxBE74u0CFltzHIBFFAjWm3tSkXXhrERav1zDq', Rol = 'administrador', Activo = 1
    WHERE Usuario = 'admin' OR Correo = 'admin@nova.com';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE Usuario = 'cliente' OR Correo = 'cliente@nova.com')
BEGIN
    INSERT INTO dbo.usuarios (Usuario, Nombre, Apellido, Correo, Contrasena, PasswordHash, Rol, Telefono, Direccion, Activo)
    VALUES ('cliente', N'Juan', N'Perez', 'cliente@nova.com', '1234', '/IFreJMWloZBcxBE74u0CFltzHIBFFAjWm3tSkXXhrERav1zDq', 'cliente', '987654321', N'Calle Los Pinos 123, Miraflores, Lima', 1);
END
ELSE
BEGIN
    UPDATE dbo.usuarios 
    SET Contrasena = '1234', PasswordHash = '/IFreJMWloZBcxBE74u0CFltzHIBFFAjWm3tSkXXhrERav1zDq', Rol = 'cliente', Activo = 1
    WHERE Usuario = 'cliente' OR Correo = 'cliente@nova.com';
END
GO

-- D. CATALOGO DE PRODUCTOS BOUTIQUE CON FOTOS REALES
INSERT INTO dbo.productos (IdCategoria, Nombre, Slug, Descripcion, Genero, Marca, Imagen, Activo)
SELECT c.IdCategoria, v.Nombre, v.Slug, v.Descripcion, v.Genero, v.Marca, v.Imagen, 1
FROM (VALUES
    (N'Prendas superiores', N'Blazer oversize', N'blazer-oversize', N'Blazer de corte estructurado con hombreras sutiles, confeccionado en mezcla de lana fria y forro satinado.', N'mujeres', N'NOVA Atelier', N'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=80'),
    (N'Vestidos', N'Vestido satén midi', N'vestido-saten-midi', N'Vestido midi en saten fluido con escote drapeado y abertura lateral elegante para ocasiones de etiqueta.', N'mujeres', N'NOVA Atelier', N'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=500&q=80'),
    (N'Pantalones', N'Pantalón wide leg', N'pantalon-wide-leg', N'Pantalon de tiro alto con pinzas frontales y caida amplia impecable, ideal para atuendos contemporaneos.', N'mujeres', N'NOVA Studio', N'https://images.unsplash.com/photo-1506629905607-d9c297d4a5c5?auto=format&fit=crop&w=500&q=80'),
    (N'Calzado', N'Zapatillas street', N'zapatillas-street', N'Calzado urbano confeccionado en cuero vacuno suave con suela amortiguada para comodidad durante todo el dia.', N'varones', N'NOVA Footwear', N'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85'),
    (N'Prendas superiores', N'Sudadera arcoíris', N'sudadera-arcoiris', N'Polera suave de felpa con bordado en relieve, capucha termica y tacto extrasuave.', N'niñas', N'NOVA Kids', N'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=700&q=85'),
    (N'Prendas superiores', N'Polo esencial', N'polo-esencial', N'Polo basico de algodon 100% transpirable con cuello reforzado y costuras de alta durabilidad.', N'niños', N'NOVA Kids', N'https://images.unsplash.com/photo-1519238263530-99bad5d7d3a0?auto=format&fit=crop&w=700&q=85'),
    (N'Prendas superiores', N'Camiseta premium', N'camiseta-premium', N'Camiseta de silueta regular fit en punto de algodon peinado con textura sedosa.', N'varones', N'NOVA Studio', N'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80'),
    (N'Prendas superiores', N'Chaqueta bomber', N'chaqueta-bomber', N'Bomber jacket repelente al agua con bolsillos termicos y detalles metalicos en laton envejecido.', N'mujeres', N'NOVA Studio', N'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=80'),
    (N'Pantalones', N'Jean straight fit', N'jean-straight-fit', N'Denim rigido autentico de 13 oz con lavado vintage y corte recto clasico.', N'varones', N'NOVA Denim', N'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=80'),
    (N'Prendas superiores', N'Top de encaje', N'top-de-encaje', N'Top con aplicaciones de encaje chantilly y tirantes ajustables, perfecto para lucir bajo blazers.', N'mujeres', N'NOVA Atelier', N'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80'),
    (N'Sets', N'Conjunto deportivo', N'conjunto-deportivo', N'Set coordinado de dos piezas en tejido elastico transpirable de secado rapido.', N'niñas', N'NOVA Active', N'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=500&q=80'),
    (N'Faldas', N'Skirt de lino', N'skirt-de-lino', N'Falda midi con botones de corozo frontal y abertura que aporta ligereza y movimiento.', N'mujeres', N'NOVA Studio', N'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80'),
    (N'Prendas superiores', N'Coat minimal', N'coat-minimal', N'Abrigo largo sastre confeccionado en pano de lana con solapa ancha y cinturon anudable.', N'mujeres', N'NOVA Atelier', N'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=500&q=80'),
    (N'Calzado', N'Botines premium', N'botines-premium', N'Botines en piel autentica con tacon de bloque comodo y cierre lateral ergonomico.', N'mujeres', N'NOVA Footwear', N'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85')
) AS v(CategoriaNombre, Nombre, Slug, Descripcion, Genero, Marca, Imagen)
JOIN dbo.categorias c ON c.Nombre = v.CategoriaNombre
WHERE NOT EXISTS (SELECT 1 FROM dbo.productos p WHERE p.Slug = v.Slug);
GO

-- E. VARIANTES CON TALLAS, COLORES Y STOCK
INSERT INTO dbo.producto_variantes (IdProducto, Talla, Color, Stock, Precio, CodigoSKU, Activo)
SELECT p.IdProducto, v.Talla, v.Color, v.Stock, v.Precio, v.CodigoSKU, 1
FROM (VALUES
    -- Blazer oversize
    (N'blazer-oversize', N'S', N'Negro carbón', 6, 189.00, 'NOV-BLZ-001-S-NEG'),
    (N'blazer-oversize', N'M', N'Negro carbón', 8, 189.00, 'NOV-BLZ-001-M-NEG'),
    (N'blazer-oversize', N'L', N'Negro carbón', 4, 189.00, 'NOV-BLZ-001-L-NEG'),
    -- Vestido satén midi
    (N'vestido-saten-midi', N'XS', N'Verde oliva', 3, 229.00, 'NOV-VES-002-XS-VER'),
    (N'vestido-saten-midi', N'S', N'Verde oliva', 4, 229.00, 'NOV-VES-002-S-VER'),
    -- Pantalón wide leg
    (N'pantalon-wide-leg', N'M', N'Beige arena', 12, 149.00, 'NOV-PAN-003-M-BEI'),
    (N'pantalon-wide-leg', N'L', N'Beige arena', 12, 149.00, 'NOV-PAN-003-L-BEI'),
    -- Zapatillas street
    (N'zapatillas-street', N'40', N'Blanco', 5, 159.00, 'NOV-ZAP-004-40-BLA'),
    (N'zapatillas-street', N'41', N'Blanco', 5, 159.00, 'NOV-ZAP-004-41-BLA'),
    (N'zapatillas-street', N'42', N'Blanco', 5, 159.00, 'NOV-ZAP-004-42-BLA'),
    -- Sudadera arcoíris
    (N'sudadera-arcoiris', N'8', N'Lavanda', 6, 99.00, 'NOV-SUD-005-8-LAV'),
    (N'sudadera-arcoiris', N'10', N'Lavanda', 6, 99.00, 'NOV-SUD-005-10-LAV'),
    -- Polo esencial
    (N'polo-esencial', N'10', N'Azul cielo', 10, 69.00, 'NOV-POL-006-10-AZU'),
    (N'polo-esencial', N'12', N'Azul cielo', 10, 69.00, 'NOV-POL-006-12-AZU'),
    -- Camiseta premium
    (N'camiseta-premium', N'S', N'Blanco hueso', 8, 89.00, 'NOV-CAM-007-S-BLA'),
    (N'camiseta-premium', N'M', N'Blanco hueso', 10, 89.00, 'NOV-CAM-007-M-BLA'),
    (N'camiseta-premium', N'L', N'Blanco hueso', 8, 89.00, 'NOV-CAM-007-L-BLA'),
    -- Chaqueta bomber
    (N'chaqueta-bomber', N'M', N'Caqui', 6, 219.00, 'NOV-CHA-008-M-CAQ'),
    (N'chaqueta-bomber', N'L', N'Caqui', 5, 219.00, 'NOV-CHA-008-L-CAQ'),
    -- Jean straight fit
    (N'jean-straight-fit', N'30', N'Indigo', 6, 169.00, 'NOV-JEN-009-30-IND'),
    (N'jean-straight-fit', N'32', N'Indigo', 7, 169.00, 'NOV-JEN-009-32-IND'),
    -- Top de encaje
    (N'top-de-encaje', N'XS', N'Blanco marfil', 8, 95.00, 'NOV-SHL-010-XS-BLA'),
    (N'top-de-encaje', N'S', N'Blanco marfil', 8, 95.00, 'NOV-SHL-010-S-BLA'),
    -- Conjunto deportivo
    (N'conjunto-deportivo', N'8', N'Rosado pastel', 5, 179.00, 'NOV-SET-011-8-ROS'),
    (N'conjunto-deportivo', N'10', N'Rosado pastel', 4, 179.00, 'NOV-SET-011-10-ROS'),
    -- Skirt de lino
    (N'skirt-de-lino', N'S', N'Terracota', 7, 129.00, 'NOV-SKI-012-S-TER'),
    (N'skirt-de-lino', N'M', N'Terracota', 7, 129.00, 'NOV-SKI-012-M-TER'),
    -- Coat minimal
    (N'coat-minimal', N'M', N'Camel', 4, 249.00, 'NOV-COA-013-M-CAM'),
    (N'coat-minimal', N'L', N'Camel', 4, 249.00, 'NOV-COA-013-L-CAM'),
    -- Botines premium
    (N'botines-premium', N'37', N'Marrón', 5, 199.00, 'NOV-BOT-014-37-MAR'),
    (N'botines-premium', N'38', N'Marrón', 5, 199.00, 'NOV-BOT-014-38-MAR'),
    (N'botines-premium', N'39', N'Marrón', 5, 199.00, 'NOV-BOT-014-39-MAR')
) AS v(ProductSlug, Talla, Color, Stock, Precio, CodigoSKU)
JOIN dbo.productos p ON p.Slug = v.ProductSlug
WHERE NOT EXISTS (SELECT 1 FROM dbo.producto_variantes pv WHERE pv.CodigoSKU = v.CodigoSKU);
GO

-- F. GALERIA DE IMAGENES ADICIONALES
INSERT INTO dbo.ProductoImagenes (IdProducto, Url, TextoAlternativo, Orden, Activo)
SELECT p.IdProducto, p.Imagen, p.Nombre, 1, 1
FROM dbo.productos p
WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductoImagenes pi WHERE pi.IdProducto = p.IdProducto AND pi.Url = p.Imagen);
GO

-- G. PEDIDOS DE PRUEBA REALISTAS PARA EL DASHBOARD DE METRICAS
-- Si no existen pedidos, sembramos 9 pedidos distribuidos a lo largo de la semana
IF NOT EXISTS (SELECT 1 FROM dbo.pedidos)
BEGIN
    DECLARE @idUser INT = (SELECT TOP 1 IdUsuario FROM dbo.usuarios WHERE Usuario = 'cliente');
    DECLARE @idMetodo INT = (SELECT TOP 1 IdMetodoPago FROM dbo.metodos_pago WHERE Nombre = 'Yape');
    IF @idMetodo IS NULL SET @idMetodo = (SELECT TOP 1 IdMetodoPago FROM dbo.metodos_pago);

    -- Variables para variantes
    DECLARE @vBlazer INT = (SELECT TOP 1 IdVariante FROM dbo.producto_variantes WHERE CodigoSKU = 'NOV-BLZ-001-M-NEG');
    DECLARE @vVestido INT = (SELECT TOP 1 IdVariante FROM dbo.producto_variantes WHERE CodigoSKU = 'NOV-VES-002-S-VER');
    DECLARE @vPantalon INT = (SELECT TOP 1 IdVariante FROM dbo.producto_variantes WHERE CodigoSKU = 'NOV-PAN-003-M-BEI');
    DECLARE @vZapatillas INT = (SELECT TOP 1 IdVariante FROM dbo.producto_variantes WHERE CodigoSKU = 'NOV-ZAP-004-41-BLA');
    DECLARE @vCoat INT = (SELECT TOP 1 IdVariante FROM dbo.producto_variantes WHERE CodigoSKU = 'NOV-COA-013-M-CAM');

    DECLARE @idPed INT;

    -- Pedido 1: Hace 6 dias (Entregado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'entregado', 378.00, 0, 0, 378.00, 'PEN', N'Av. Larco 742, Miraflores', DATEADD(DAY, -6, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vBlazer IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vBlazer, 2, 189.00, 378.00);

    -- Pedido 2: Hace 5 dias (Entregado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'entregado', 229.00, 0, 0, 229.00, 'PEN', N'Calle Alcanfores 290, Miraflores', DATEADD(DAY, -5, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vVestido IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vVestido, 1, 229.00, 229.00);

    -- Pedido 3: Hace 4 dias (Entregado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'entregado', 308.00, 0, 0, 308.00, 'PEN', N'Jr. Huallaga 120, Lima Cercado', DATEADD(DAY, -4, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vPantalon IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vPantalon, 1, 149.00, 149.00);
    IF @vZapatillas IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vZapatillas, 1, 159.00, 159.00);

    -- Pedido 4: Hace 3 dias (Entregado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'entregado', 249.00, 0, 0, 249.00, 'PEN', N'Av. Primavera 550, Surco', DATEADD(DAY, -3, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vCoat IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vCoat, 1, 249.00, 249.00);

    -- Pedido 5: Hace 2 dias (Enviado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'enviado', 418.00, 0, 0, 418.00, 'PEN', N'Av. Benavides 1890, Miraflores', DATEADD(DAY, -2, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vBlazer IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vBlazer, 1, 189.00, 189.00);
    IF @vVestido IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vVestido, 1, 229.00, 229.00);

    -- Pedido 6: Ayer (Enviado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'enviado', 189.00, 0, 0, 189.00, 'PEN', N'Calle 2 de Mayo 430, San Isidro', DATEADD(DAY, -1, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vBlazer IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vBlazer, 1, 189.00, 189.00);

    -- Pedido 7: Hoy temprano (Preparando)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'preparando', 378.00, 0, 0, 378.00, 'PEN', N'Av. El Sol 820, Barranco', DATEADD(HOUR, -4, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vPantalon IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vPantalon, 1, 149.00, 149.00);
    IF @vVestido IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vVestido, 1, 229.00, 229.00);

    -- Pedido 8: Hoy tarde (Pagado)
    INSERT INTO dbo.pedidos (IdUsuario, IdMetodoPago, Estado, Subtotal, Descuento, Envio, Total, Moneda, DireccionEnvio, FechaPedido)
    VALUES (@idUser, @idMetodo, 'pagado', 159.00, 0, 0, 159.00, 'PEN', N'Av. Salaverry 2400, San Isidro', DATEADD(MINUTE, -45, SYSDATETIME()));
    SET @idPed = SCOPE_IDENTITY();
    IF @vZapatillas IS NOT NULL INSERT INTO dbo.pedido_detalle VALUES (@idPed, @vZapatillas, 1, 159.00, 159.00);
END
GO

-- ============================================================================
-- VERIFICACION FINAL
-- ============================================================================
PRINT '============================================================';
PRINT 'BASE DE DATOS TiendaRopa INICIALIZADA EXITOSAMENTE';
PRINT '============================================================';

SELECT 'Categorias' AS Tabla, COUNT(*) AS CantidadRegistros FROM dbo.categorias
UNION ALL
SELECT 'Usuarios', COUNT(*) FROM dbo.usuarios
UNION ALL
SELECT 'Metodos de Pago', COUNT(*) FROM dbo.metodos_pago
UNION ALL
SELECT 'Productos', COUNT(*) FROM dbo.productos
UNION ALL
SELECT 'Producto Variantes', COUNT(*) FROM dbo.producto_variantes
UNION ALL
SELECT 'Pedidos', COUNT(*) FROM dbo.pedidos
UNION ALL
SELECT 'Pedido Detalle', COUNT(*) FROM dbo.pedido_detalle;
GO