-- =====================================================================
-- BASE DE DATOS COMPLETA PARA MYSQL: TiendaRopa
-- Proyecto: Sistema de Gestión de Ventas / Ecommerce de Ropa
-- Unificado a partir de database-TiendaRopa.sql, migraciones y server.js
-- =====================================================================

CREATE DATABASE IF NOT EXISTS TiendaRopa 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE TiendaRopa;

-- Desactivar chequeo de llaves foráneas temporalmente para recreación limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tokens_recuperacion;
DROP TABLE IF EXISTS direcciones;
DROP TABLE IF EXISTS carrito;
DROP TABLE IF EXISTS pedido_detalle;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS metodos_pago;
DROP TABLE IF EXISTS ProductoImagenes;
DROP TABLE IF EXISTS producto_variantes;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. TABLA: categorias
-- =====================================================================
CREATE TABLE categorias (
  IdCategoria INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(100) NOT NULL,
  Slug VARCHAR(120) NOT NULL,
  Descripcion VARCHAR(300) NULL,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdCategoria),
  UNIQUE KEY UQ_categorias_Nombre (Nombre),
  UNIQUE KEY UQ_categorias_Slug (Slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. TABLA: usuarios
-- =====================================================================
CREATE TABLE usuarios (
  IdUsuario INT NOT NULL AUTO_INCREMENT,
  Usuario VARCHAR(100) NULL,
  Nombre VARCHAR(100) NOT NULL,
  Apellido VARCHAR(100) NOT NULL,
  Correo VARCHAR(150) NOT NULL,
  Contrasena VARCHAR(255) NOT NULL,
  PasswordHash VARCHAR(255) NULL,
  Rol VARCHAR(30) NOT NULL DEFAULT 'cliente',
  Telefono VARCHAR(20) NULL,
  Direccion VARCHAR(250) NULL,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdUsuario),
  UNIQUE KEY UQ_usuarios_Correo (Correo),
  UNIQUE KEY UQ_usuarios_Usuario (Usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. TABLA: productos
-- =====================================================================
CREATE TABLE productos (
  IdProducto INT NOT NULL AUTO_INCREMENT,
  IdCategoria INT NOT NULL,
  Nombre VARCHAR(150) NOT NULL,
  Slug VARCHAR(180) NOT NULL,
  Descripcion VARCHAR(500) NULL,
  Genero VARCHAR(30) NOT NULL DEFAULT 'unisex',
  Marca VARCHAR(100) NULL DEFAULT 'NOVA',
  Imagen VARCHAR(500) NULL,
  Precio DECIMAL(10,2) NULL,
  Stock INT NULL DEFAULT 0,
  Categoria VARCHAR(100) NULL,
  SKU VARCHAR(50) NULL,
  Talla VARCHAR(20) NULL,
  Color VARCHAR(100) NULL,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdProducto),
  KEY IDX_productos_categoria (IdCategoria),
  CONSTRAINT FK_productos_categorias FOREIGN KEY (IdCategoria) 
    REFERENCES categorias (IdCategoria) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. TABLA: producto_variantes
-- =====================================================================
CREATE TABLE producto_variantes (
  IdVariante INT NOT NULL AUTO_INCREMENT,
  IdProducto INT NOT NULL,
  Talla VARCHAR(20) NOT NULL,
  Color VARCHAR(50) NOT NULL,
  Stock INT NOT NULL DEFAULT 0,
  Precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CodigoSKU VARCHAR(50) NOT NULL,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (IdVariante),
  KEY IDX_variantes_producto (IdProducto),
  KEY IDX_variantes_sku (CodigoSKU),
  KEY IX_producto_variantes_producto_talla_color (IdProducto, Talla, Color),
  CONSTRAINT FK_variantes_productos FOREIGN KEY (IdProducto) 
    REFERENCES productos (IdProducto) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. TABLA: ProductoImagenes
-- =====================================================================
CREATE TABLE ProductoImagenes (
  IdImagen INT NOT NULL AUTO_INCREMENT,
  IdProducto INT NOT NULL,
  IdVariante INT NULL,
  Url VARCHAR(500) NOT NULL,
  TextoAlternativo VARCHAR(180) NULL,
  Orden INT NOT NULL DEFAULT 0,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdImagen),
  KEY IDX_imagenes_producto (IdProducto),
  KEY IDX_imagenes_variante (IdVariante),
  CONSTRAINT FK_ProductoImagenes_Producto FOREIGN KEY (IdProducto) 
    REFERENCES productos (IdProducto) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT FK_ProductoImagenes_Variante FOREIGN KEY (IdVariante) 
    REFERENCES producto_variantes (IdVariante) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. TABLA: metodos_pago
-- =====================================================================
CREATE TABLE metodos_pago (
  IdMetodoPago INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(80) NOT NULL,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdMetodoPago),
  UNIQUE KEY UQ_metodos_pago_Nombre (Nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. TABLA: pedidos
-- =====================================================================
CREATE TABLE pedidos (
  IdPedido INT NOT NULL AUTO_INCREMENT,
  IdUsuario INT NULL,
  IdMetodoPago INT NULL,
  Estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  Subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  Descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  Envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  Total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  Moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  DireccionEnvio VARCHAR(250) NULL,
  FechaPedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdPedido),
  KEY IDX_pedidos_usuario (IdUsuario),
  KEY IDX_pedidos_metodo_pago (IdMetodoPago),
  KEY IX_pedidos_usuario_fecha (IdUsuario, FechaPedido DESC),
  CONSTRAINT FK_pedidos_usuarios FOREIGN KEY (IdUsuario) 
    REFERENCES usuarios (IdUsuario) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT FK_pedidos_metodos_pago FOREIGN KEY (IdMetodoPago) 
    REFERENCES metodos_pago (IdMetodoPago) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. TABLA: pedido_detalle
-- =====================================================================
CREATE TABLE pedido_detalle (
  IdDetalle INT NOT NULL AUTO_INCREMENT,
  IdPedido INT NOT NULL,
  IdVariante INT NOT NULL,
  Cantidad INT NOT NULL,
  PrecioUnitario DECIMAL(10,2) NOT NULL,
  Subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (IdDetalle),
  KEY IDX_detalle_pedido (IdPedido),
  KEY IDX_detalle_variante (IdVariante),
  CONSTRAINT FK_detalle_pedidos FOREIGN KEY (IdPedido) 
    REFERENCES pedidos (IdPedido) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT FK_detalle_variantes FOREIGN KEY (IdVariante) 
    REFERENCES producto_variantes (IdVariante) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. TABLA: carrito
-- =====================================================================
CREATE TABLE carrito (
  IdCarrito INT NOT NULL AUTO_INCREMENT,
  IdUsuario INT NOT NULL,
  IdVariante INT NOT NULL,
  Cantidad INT NOT NULL DEFAULT 1,
  PrecioUnitario DECIMAL(10,2) NOT NULL,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdCarrito),
  KEY IX_carrito_usuario (IdUsuario, IdVariante),
  CONSTRAINT FK_carrito_usuarios FOREIGN KEY (IdUsuario) 
    REFERENCES usuarios (IdUsuario) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT FK_carrito_variantes FOREIGN KEY (IdVariante) 
    REFERENCES producto_variantes (IdVariante) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. TABLA: direcciones
-- =====================================================================
CREATE TABLE direcciones (
  IdDireccion INT NOT NULL AUTO_INCREMENT,
  IdUsuario INT NOT NULL,
  NombreContacto VARCHAR(100) NOT NULL,
  Telefono VARCHAR(20) NULL,
  Departamento VARCHAR(80) NULL,
  Provincia VARCHAR(80) NULL,
  Distrito VARCHAR(80) NULL,
  Direccion VARCHAR(250) NOT NULL,
  Referencia VARCHAR(200) NULL,
  Predeterminada TINYINT(1) NOT NULL DEFAULT 0,
  Activo TINYINT(1) NOT NULL DEFAULT 1,
  CreadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdDireccion),
  KEY IDX_direcciones_usuario (IdUsuario),
  CONSTRAINT FK_direcciones_usuarios FOREIGN KEY (IdUsuario) 
    REFERENCES usuarios (IdUsuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. TABLA: tokens_recuperacion
-- =====================================================================
CREATE TABLE tokens_recuperacion (
  IdToken INT NOT NULL AUTO_INCREMENT,
  IdUsuario INT NOT NULL,
  TokenHash VARCHAR(64) NOT NULL,
  ExpiraEn DATETIME NOT NULL,
  UsadoEn DATETIME NULL,
  PRIMARY KEY (IdToken),
  KEY IDX_tokens_usuario (IdUsuario),
  CONSTRAINT FK_tokens_recuperacion_usuarios FOREIGN KEY (IdUsuario) 
    REFERENCES usuarios (IdUsuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- INSERCIÓN DE DATOS INICIALES (SEMILLA / SEED DATA)
-- =====================================================================

-- Métodos de pago
INSERT INTO metodos_pago (IdMetodoPago, Nombre, Activo) VALUES
(1, 'Yape', 1),
(2, 'Plin', 1),
(3, 'Tarjeta', 1),
(4, 'Transferencia', 1),
(5, 'Efectivo', 1);

-- Categorías
INSERT INTO categorias (IdCategoria, Nombre, Slug, Descripcion, Activo) VALUES
(1, 'Prendas superiores', 'prendas-superiores', 'Polos, blusas, camisetas y blazers', 1),
(2, 'Vestidos', 'vestidos', 'Vestidos formales, de noche y casuales', 1),
(3, 'Pantalones', 'pantalones', 'Jeans, pantalones de vestir y joggers', 1),
(4, 'Calzado', 'calzado', 'Zapatillas urbanas, botines y calzado cómodo', 1),
(5, 'Sets', 'sets', 'Conjuntos de moda y outfits coordinados', 1),
(6, 'Faldas', 'faldas', 'Faldas midi, mini y de lino', 1),
(7, 'Accesorios', 'accesorios', 'Complementos para todo tipo de ocasión', 1),
(8, 'Novedades', 'novedades', 'Últimos lanzamientos y tendencias', 1);

-- Usuarios iniciales (Admin y Cliente Demo)
-- Clave por defecto para ambos: 1234
INSERT INTO usuarios (IdUsuario, Usuario, Nombre, Apellido, Correo, Contrasena, PasswordHash, Rol, Telefono, Direccion, Activo) VALUES
(1, 'admin', 'Administrador', 'Nova', 'admin@tiendaropa.com', '1234', '1234', 'admin', '999888777', 'Av. Principal 123', 1),
(2, 'cliente', 'Juan', 'Perez', 'cliente@tiendaropa.com', '1234', '1234', 'cliente', '987654321', 'Av. Las Flores 456', 1);

-- Productos del catálogo
INSERT INTO productos (IdProducto, IdCategoria, Nombre, Slug, Descripcion, Genero, Marca, Imagen, Precio, Stock, Categoria, SKU, Talla, Color, Activo) VALUES
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

-- Variantes de productos (Talla, Color, Stock, Precio, SKU)
INSERT INTO producto_variantes (IdVariante, IdProducto, Talla, Color, Stock, Precio, CodigoSKU, Activo) VALUES
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

-- Imágenes de productos (galería)
INSERT INTO ProductoImagenes (IdProducto, IdVariante, Url, TextoAlternativo, Orden, Activo)
SELECT p.IdProducto, pv.IdVariante, p.Imagen, p.Nombre, 0, 1
FROM productos p
INNER JOIN producto_variantes pv ON pv.IdProducto = p.IdProducto;
