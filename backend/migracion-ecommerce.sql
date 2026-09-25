USE [TiendaRopa];
GO

IF OBJECT_ID('dbo.ProductoImagenes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductoImagenes (
        IdImagen INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdProducto INT NOT NULL,
        IdVariante INT NULL,
        Url VARCHAR(500) NOT NULL,
        TextoAlternativo VARCHAR(180) NULL,
        Orden INT NOT NULL CONSTRAINT DF_ProductoImagenes_Orden DEFAULT 0,
        Activo BIT NOT NULL CONSTRAINT DF_ProductoImagenes_Activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_ProductoImagenes_CreadoEn DEFAULT SYSDATETIME(),
        CONSTRAINT FK_ProductoImagenes_Producto FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto),
        CONSTRAINT FK_ProductoImagenes_Variante FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
    );
END;
GO

INSERT INTO dbo.ProductoImagenes (IdProducto, Url, TextoAlternativo, Orden)
SELECT p.IdProducto, p.Imagen, p.Nombre, 0
FROM dbo.productos p
WHERE NULLIF(LTRIM(RTRIM(p.Imagen)), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.ProductoImagenes i
      WHERE i.IdProducto = p.IdProducto AND i.Url = p.Imagen
  );
GO

IF OBJECT_ID('dbo.carrito', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.carrito (
        IdCarrito INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdUsuario INT NOT NULL,
        IdVariante INT NOT NULL,
        Cantidad INT NOT NULL CONSTRAINT DF_carrito_cantidad DEFAULT 1,
        PrecioUnitario DECIMAL(10,2) NOT NULL,
        CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_carrito_creado DEFAULT SYSDATETIME(),
        CONSTRAINT CK_carrito_cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_carrito_precio CHECK (PrecioUnitario >= 0),
        CONSTRAINT FK_carrito_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario),
        CONSTRAINT FK_carrito_variantes FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
    );
END;
GO

IF OBJECT_ID('dbo.direcciones', 'U') IS NULL
BEGIN
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
        CONSTRAINT FK_direcciones_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario)
    );
END;
GO

IF OBJECT_ID('dbo.metodos_pago', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.metodos_pago (
        IdMetodoPago INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre VARCHAR(80) NOT NULL UNIQUE,
        Activo BIT NOT NULL CONSTRAINT DF_metodos_pago_activo DEFAULT 1,
        CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_metodos_pago_creado DEFAULT SYSDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.metodos_pago)
BEGIN
    INSERT INTO dbo.metodos_pago (Nombre)
    VALUES ('Yape'), ('Plin'), ('Tarjeta'), ('Transferencia');
END;
GO

IF COL_LENGTH('dbo.pedidos', 'IdMetodoPago') IS NULL
BEGIN
    ALTER TABLE dbo.pedidos ADD IdMetodoPago INT NULL;
    ALTER TABLE dbo.pedidos ADD CONSTRAINT FK_pedidos_metodos_pago FOREIGN KEY (IdMetodoPago) REFERENCES dbo.metodos_pago (IdMetodoPago);
END;
GO

IF COL_LENGTH('dbo.pedidos', 'DireccionEnvio') IS NULL
BEGIN
    ALTER TABLE dbo.pedidos ADD DireccionEnvio VARCHAR(250) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_producto_variantes_producto_talla_color' AND object_id = OBJECT_ID('dbo.producto_variantes'))
BEGIN
    CREATE INDEX IX_producto_variantes_producto_talla_color
    ON dbo.producto_variantes (IdProducto, Talla, Color)
    INCLUDE (Stock, Precio, Activo);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_pedidos_usuario_fecha' AND object_id = OBJECT_ID('dbo.pedidos'))
BEGIN
    CREATE INDEX IX_pedidos_usuario_fecha
    ON dbo.pedidos (IdUsuario, FechaPedido DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_carrito_usuario' AND object_id = OBJECT_ID('dbo.carrito'))
BEGIN
    CREATE INDEX IX_carrito_usuario
    ON dbo.carrito (IdUsuario, IdVariante);
END;
GO

SELECT 'Migración ecommerce aplicada correctamente.' AS Resultado;
GO
