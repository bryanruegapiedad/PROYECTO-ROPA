IF DB_ID(N'TiendaRopa') IS NULL
    CREATE DATABASE TiendaRopa;
GO

USE TiendaRopa;
GO

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
GO

CREATE TABLE dbo.usuarios (
    IdUsuario INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_usuarios PRIMARY KEY,
    Usuario VARCHAR(100) NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Apellido NVARCHAR(100) NOT NULL,
    Correo VARCHAR(150) NOT NULL
        CONSTRAINT UQ_usuarios_Correo UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    Rol VARCHAR(30) NOT NULL
        CONSTRAINT DF_usuarios_Rol DEFAULT 'cliente',
    Telefono VARCHAR(20) NULL,
    Direccion NVARCHAR(250) NULL,
    Activo BIT NOT NULL
        CONSTRAINT DF_usuarios_Activo DEFAULT 1,
    CreadoEn DATETIME2 NOT NULL
        CONSTRAINT DF_usuarios_CreadoEn DEFAULT SYSDATETIME(),
    CONSTRAINT CK_usuarios_Rol
        CHECK (Rol IN ('cliente', 'administrador', 'vendedor'))
);
GO

CREATE UNIQUE INDEX UX_usuarios_Usuario
    ON dbo.usuarios (Usuario)
    WHERE Usuario IS NOT NULL;
GO

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
        CHECK (Genero IN (N'hombre', N'mujer', N'unisex', N'niño', N'niña')),
    CONSTRAINT FK_productos_categorias
        FOREIGN KEY (IdCategoria) REFERENCES dbo.categorias (IdCategoria)
);
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

CREATE INDEX IX_variantes_Producto_Talla_Color
    ON dbo.producto_variantes (IdProducto, Talla, Color)
    INCLUDE (Stock, Precio, Activo);
GO

CREATE INDEX IX_pedidos_Usuario_Fecha
    ON dbo.pedidos (IdUsuario, FechaPedido DESC);
GO

CREATE INDEX IX_carrito_Usuario
    ON dbo.carrito (IdUsuario, IdVariante);
GO

CREATE INDEX IX_ProductoImagenes_Producto_Orden
    ON dbo.ProductoImagenes (IdProducto, Orden);
GO

CREATE INDEX IX_tokens_recuperacion_Usuario_Expira
    ON dbo.tokens_recuperacion (IdUsuario, ExpiraEn);
GO

INSERT INTO dbo.metodos_pago (Nombre)
VALUES (N'Yape'), (N'Plin'), (N'Tarjeta'), (N'Transferencia');
GO

INSERT INTO dbo.categorias (Nombre, Slug, Descripcion)
VALUES
    (N'Polos', N'polos', N'Polos de diferentes modelos y estilos'),
    (N'Pantalones', N'pantalones', N'Pantalones para hombre y mujer'),
    (N'Casacas', N'casacas', N'Casacas y prendas para exteriores'),
    (N'Poleras', N'poleras', N'Poleras y sudaderas'),
    (N'Vestidos', N'vestidos', N'Vestidos para diferentes ocasiones'),
    (N'Faldas', N'faldas', N'Faldas de diferentes diseños'),
    (N'Shorts', N'shorts', N'Shorts para hombre y mujer'),
    (N'Camisas', N'camisas', N'Camisas casuales y formales'),
    (N'Blusas', N'blusas', N'Blusas para mujer'),
    (N'Zapatillas', N'zapatillas', N'Calzado deportivo y casual');
GO

-- Verificación del esquema creado:
SELECT DB_NAME() AS BaseActual;
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

INSERT INTO dbo.producto_variantes (IdProducto, Talla, Color, Stock, Precio, CodigoSKU, Activo)
SELECT p.IdProducto, v.Talla, v.Color, v.Stock, v.Precio, v.CodigoSKU, 1
FROM (VALUES
  (N'Polo Básico Algodón',N'XS',N'Negro',4,39.90,'POL-BAS-ALG-NEG-XS'),
  (N'Polo Básico Algodón',N'S',N'Negro',5,39.90,'POL-BAS-ALG-NEG-S'),
  (N'Polo Básico Algodón',N'M',N'Negro',3,39.90,'POL-BAS-ALG-NEG-M'),
  (N'Polo Básico Algodón',N'L',N'Negro',4,39.90,'POL-BAS-ALG-NEG-L'),
  (N'Polo Básico Algodón',N'XL',N'Negro',5,39.90,'POL-BAS-ALG-NEG-XL'),
  (N'Polo Básico Algodón',N'XS',N'Blanco',3,39.90,'POL-BAS-ALG-BLA-XS'),
  (N'Polo Básico Algodón',N'S',N'Blanco',4,39.90,'POL-BAS-ALG-BLA-S'),
  (N'Polo Básico Algodón',N'M',N'Blanco',5,39.90,'POL-BAS-ALG-BLA-M'),
  (N'Polo Básico Algodón',N'L',N'Blanco',3,39.90,'POL-BAS-ALG-BLA-L'),
  (N'Polo Básico Algodón',N'M',N'Azul',4,39.90,'POL-BAS-ALG-AZU-M'),
  (N'Polo Básico Algodón',N'L',N'Azul',5,39.90,'POL-BAS-ALG-AZU-L'),
  (N'Polo Básico Algodón',N'M',N'Rojo',3,39.90,'POL-BAS-ALG-ROJ-M'),
  (N'Polo Básico Algodón',N'L',N'Rojo',4,39.90,'POL-BAS-ALG-ROJ-L'),
  (N'Jean Clásico',N'28',N'Azul',5,89.90,'JEA-CLA-AZU-28'),
  (N'Jean Clásico',N'30',N'Azul',3,89.90,'JEA-CLA-AZU-30'),
  (N'Jean Clásico',N'32',N'Azul',4,89.90,'JEA-CLA-AZU-32'),
  (N'Jean Clásico',N'30',N'Negro',5,99.90,'JEA-CLA-NEG-30'),
  (N'Jean Clásico',N'32',N'Negro',3,99.90,'JEA-CLA-NEG-32'),
  (N'Jean Clásico',N'30',N'Beige',4,109.90,'JEA-CLA-BEI-30'),
  (N'Jean Clásico',N'32',N'Beige',5,109.90,'JEA-CLA-BEI-32'),
  (N'Jean Clásico',N'30',N'Gris',3,109.90,'JEA-CLA-GRI-30'),
  (N'Jean Clásico',N'32',N'Gris',4,109.90,'JEA-CLA-GRI-32'),
  (N'Vestido Casual',N'S',N'Azul',5,109.90,'VES-CAS-AZU-S'),
  (N'Vestido Casual',N'M',N'Azul',3,109.90,'VES-CAS-AZU-M'),
  (N'Vestido Casual',N'L',N'Azul',4,109.90,'VES-CAS-AZU-L'),
  (N'Vestido Casual',N'S',N'Negro',5,109.90,'VES-CAS-NEG-S'),
  (N'Vestido Casual',N'M',N'Negro',3,109.90,'VES-CAS-NEG-M'),
  (N'Vestido Casual',N'L',N'Negro',4,109.90,'VES-CAS-NEG-L'),
  (N'Vestido Casual',N'S',N'Rojo',5,109.90,'VES-CAS-ROJ-S'),
  (N'Vestido Casual',N'M',N'Rojo',3,109.90,'VES-CAS-ROJ-M'),
  (N'Vestido Casual',N'L',N'Rojo',4,109.90,'VES-CAS-ROJ-L'),
  (N'Vestido Casual',N'S',N'Beige',5,109.90,'VES-CAS-BEI-S'),
  (N'Vestido Casual',N'M',N'Beige',3,109.90,'VES-CAS-BEI-M'),
  (N'Vestido Casual',N'L',N'Beige',4,109.90,'VES-CAS-BEI-L'),
  (N'Zapatilla Casual',N'36',N'Blanco',5,129.90,'ZAP-CAS-BLA-36'),
  (N'Zapatilla Casual',N'37',N'Blanco',3,129.90,'ZAP-CAS-BLA-37'),
  (N'Zapatilla Casual',N'38',N'Blanco',4,129.90,'ZAP-CAS-BLA-38'),
  (N'Zapatilla Casual',N'39',N'Blanco',5,129.90,'ZAP-CAS-BLA-39'),
  (N'Zapatilla Casual',N'40',N'Blanco',3,129.90,'ZAP-CAS-BLA-40'),
  (N'Zapatilla Casual',N'41',N'Blanco',4,129.90,'ZAP-CAS-BLA-41'),
  (N'Zapatilla Casual',N'36',N'Negro',5,129.90,'ZAP-CAS-NEG-36'),
  (N'Zapatilla Casual',N'38',N'Negro',3,129.90,'ZAP-CAS-NEG-38'),
  (N'Zapatilla Casual',N'40',N'Negro',4,129.90,'ZAP-CAS-NEG-40'),
  (N'Zapatilla Casual',N'42',N'Negro',5,129.90,'ZAP-CAS-NEG-42'),
  (N'Zapatilla Casual',N'37',N'Rosa',3,139.90,'ZAP-CAS-ROS-37'),
  (N'Zapatilla Casual',N'39',N'Rosa',4,139.90,'ZAP-CAS-ROS-39'),
  (N'Zapatilla Casual',N'40',N'Rosa',5,139.90,'ZAP-CAS-ROS-40'),
  (N'Zapatilla Casual',N'42',N'Rosa',3,139.90,'ZAP-CAS-ROS-42'),
  (N'Zapatilla Casual',N'36',N'Azul',4,139.90,'ZAP-CAS-AZU-36'),
  (N'Zapatilla Casual',N'38',N'Azul',5,139.90,'ZAP-CAS-AZU-38'),
  (N'Zapatilla Casual',N'40',N'Azul',3,139.90,'ZAP-CAS-AZU-40'),
  (N'Zapatilla Casual',N'41',N'Azul',4,139.90,'ZAP-CAS-AZU-41'),
  (N'Zapatilla Casual',N'43',N'Azul',5,139.90,'ZAP-CAS-AZU-43'),
  (N'Blusa Básica',N'XS',N'Azul',3,49.90,'BLU-BAS-AZU-XS'),
  (N'Blusa Básica',N'S',N'Azul',4,49.90,'BLU-BAS-AZU-S'),
  (N'Blusa Básica',N'M',N'Azul',5,49.90,'BLU-BAS-AZU-M'),
  (N'Blusa Básica',N'L',N'Azul',3,49.90,'BLU-BAS-AZU-L'),
  (N'Blusa Básica',N'XL',N'Azul',4,49.90,'BLU-BAS-AZU-XL'),
  (N'Blusa Básica',N'XS',N'Blanco',5,49.90,'BLU-BAS-BLA-XS'),
  (N'Blusa Básica',N'S',N'Blanco',3,49.90,'BLU-BAS-BLA-S'),
  (N'Blusa Básica',N'M',N'Blanco',4,49.90,'BLU-BAS-BLA-M'),
  (N'Blusa Básica',N'L',N'Blanco',5,49.90,'BLU-BAS-BLA-L'),
  (N'Blusa Básica',N'XL',N'Blanco',3,49.90,'BLU-BAS-BLA-XL'),
  (N'Blusa Básica',N'XS',N'Rosa',4,54.90,'BLU-BAS-ROS-XS'),
  (N'Blusa Básica',N'S',N'Rosa',5,54.90,'BLU-BAS-ROS-S'),
  (N'Blusa Básica',N'M',N'Rosa',3,54.90,'BLU-BAS-ROS-M'),
  (N'Blusa Básica',N'L',N'Rosa',4,54.90,'BLU-BAS-ROS-L'),
  (N'Blusa Básica',N'XL',N'Rosa',5,54.90,'BLU-BAS-ROS-XL'),
  (N'Polera Básica',N'XS',N'Negro',3,59.90,'POLERA-BAS-NEGRO-XS'),
  (N'Polera Básica',N'S',N'Negro',4,59.90,'POLERA-BAS-NEGRO-S'),
  (N'Polera Básica',N'M',N'Negro',5,59.90,'POLERA-BAS-NEGRO-M'),
  (N'Polera Básica',N'L',N'Negro',3,59.90,'POLERA-BAS-NEGRO-L'),
  (N'Polera Básica',N'XL',N'Negro',4,59.90,'POLERA-BAS-NEGRO-XL'),
  (N'Polera Básica',N'XS',N'Gris',5,64.90,'POLERA-BAS-GRIS-XS'),
  (N'Polera Básica',N'S',N'Gris',3,64.90,'POLERA-BAS-GRIS-S'),
  (N'Polera Básica',N'M',N'Gris',4,64.90,'POLERA-BAS-GRIS-M'),
  (N'Polera Básica',N'L',N'Gris',5,64.90,'POLERA-BAS-GRIS-L'),
  (N'Polera Básica',N'XL',N'Gris',3,64.90,'POLERA-BAS-GRIS-XL')
) AS v(NombreProducto, Talla, Color, Stock, Precio, CodigoSKU)
JOIN dbo.productos AS p ON p.Nombre = v.NombreProducto AND p.Activo = 1
WHERE NOT EXISTS (
  SELECT 1
  FROM dbo.producto_variantes AS existente
  WHERE existente.IdProducto = p.IdProducto
    AND existente.Talla = v.Talla
    AND existente.Color = v.Color
);
GO