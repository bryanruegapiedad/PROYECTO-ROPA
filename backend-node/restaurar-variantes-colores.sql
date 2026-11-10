USE TiendaRopa;
GO

-- Restaura las tallas y colores del catálogo inicial sin duplicar variantes existentes.
-- Las imágenes por color se asignan desde el backend según el nombre y el color.
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
