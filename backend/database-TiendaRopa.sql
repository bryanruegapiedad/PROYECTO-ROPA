/*
  TiendaRopa - esquema real exportado desde SQL Server.
  Este script contiene la estructura, restricciones y relaciones de la base.
  No incluye datos de usuarios ni contraseñas.
*/
USE [TiendaRopa];
GO

CREATE TABLE dbo.categorias (
  IdCategoria INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL UNIQUE,
  Slug VARCHAR(120) NOT NULL UNIQUE,
  Descripcion VARCHAR(300) NULL,
  Activo BIT NOT NULL CONSTRAINT DF_categorias_Activo DEFAULT 1,
  CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_categorias_CreadoEn DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.usuarios (
  IdUsuario INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL,
  Apellido VARCHAR(100) NOT NULL,
  Correo VARCHAR(150) NOT NULL,
  Contrasena VARCHAR(255) NOT NULL,
  Rol VARCHAR(30) NOT NULL CONSTRAINT DF_usuarios_Rol DEFAULT 'cliente',
  Telefono VARCHAR(20) NULL,
  Direccion VARCHAR(250) NULL,
  Activo BIT NOT NULL CONSTRAINT DF_usuarios_Activo DEFAULT 1,
  CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_usuarios_CreadoEn DEFAULT SYSDATETIME(),
  CONSTRAINT CK_usuarios_rol CHECK (Rol IN ('vendedor', 'administrador', 'cliente'))
);
GO

CREATE TABLE dbo.productos (
  IdProducto INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  IdCategoria INT NOT NULL,
  Nombre VARCHAR(150) NOT NULL,
  Slug VARCHAR(180) NOT NULL,
  Descripcion VARCHAR(500) NULL,
  Genero VARCHAR(30) NOT NULL,
  Marca VARCHAR(100) NULL,
  Imagen VARCHAR(300) NULL,
  Activo BIT NOT NULL CONSTRAINT DF_productos_Activo DEFAULT 1,
  CreadoEn DATETIME2 NOT NULL CONSTRAINT DF_productos_CreadoEn DEFAULT SYSDATETIME(),
  CONSTRAINT CK_productos_genero CHECK (Genero IN ('niña', 'niño', 'unisex', 'mujer', 'hombre')),
  CONSTRAINT FK_productos_categorias FOREIGN KEY (IdCategoria) REFERENCES dbo.categorias (IdCategoria)
);
GO

CREATE TABLE dbo.producto_variantes (
  IdVariante INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  IdProducto INT NOT NULL,
  Talla VARCHAR(20) NOT NULL,
  Color VARCHAR(50) NOT NULL,
  Stock INT NOT NULL CONSTRAINT DF_variantes_Stock DEFAULT 0,
  Precio DECIMAL(10,2) NOT NULL,
  CodigoSKU VARCHAR(50) NOT NULL,
  Activo BIT NOT NULL CONSTRAINT DF_variantes_Activo DEFAULT 1,
  CONSTRAINT CK_variantes_stock CHECK (Stock >= 0),
  CONSTRAINT CK_variantes_precio CHECK (Precio >= 0),
  CONSTRAINT FK_variantes_productos FOREIGN KEY (IdProducto) REFERENCES dbo.productos (IdProducto)
);
GO

CREATE TABLE dbo.pedidos (
  IdPedido INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  IdUsuario INT NULL,
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
  CONSTRAINT CK_pedidos_estado CHECK (Estado IN ('cancelado', 'entregado', 'enviado', 'preparando', 'pagado', 'pendiente')),
  CONSTRAINT CK_pedidos_subtotal CHECK (Subtotal >= 0),
  CONSTRAINT CK_pedidos_total CHECK (Total >= 0),
  CONSTRAINT FK_pedidos_usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.usuarios (IdUsuario)
);
GO

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
  CONSTRAINT FK_detalle_pedidos FOREIGN KEY (IdPedido) REFERENCES dbo.pedidos (IdPedido),
  CONSTRAINT FK_detalle_variantes FOREIGN KEY (IdVariante) REFERENCES dbo.producto_variantes (IdVariante)
);
GO