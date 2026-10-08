import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Producto, RecomendacionProducto } from '../models/producto';
import { normalizarImagenesProducto } from '../models/imagen-prenda';
export type { Producto, RecomendacionProducto } from '../models/producto';

const DEMO_PRODUCTOS: Producto[] = [
  {
    id: 1,
    sku: 'POL-BAS-ALG-NEG-M',
    nombre: 'Polo Básico Algodón',
    descripcion: 'Polo unisex en algodón con un ajuste limpio, ligero y cómodo para uso diario.',
    precio: 39.9,
    stock: 24,
    categoria: 'Polos',
    genero: 'unisex',
    talla: 'M',
    color: 'Negro',
    imagen: 'assets/images/products/polos/polo-basico-negro.jpg',
    imagenPrincipal: 'assets/images/products/polos/polo-basico-negro.jpg',
    activo: true,
    colores: ['Negro', 'Blanco', 'Azul', 'Rojo'],
    tallas: ['XS', 'S', 'M', 'L', 'XL'],
    variantes: [
      { id: 101, talla: 'XS', color: 'Negro', stock: 6, precio: 39.9, sku: 'POL-BAS-ALG-NEG-XS', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 102, talla: 'S', color: 'Negro', stock: 6, precio: 39.9, sku: 'POL-BAS-ALG-NEG-S', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 103, talla: 'M', color: 'Negro', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-NEG-M', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 104, talla: 'L', color: 'Negro', stock: 4, precio: 39.9, sku: 'POL-BAS-ALG-NEG-L', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 105, talla: 'XL', color: 'Negro', stock: 3, precio: 39.9, sku: 'POL-BAS-ALG-NEG-XL', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 106, talla: 'XS', color: 'Blanco', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-BLA-XS', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 107, talla: 'S', color: 'Blanco', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-BLA-S', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 108, talla: 'M', color: 'Blanco', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-BLA-M', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 109, talla: 'L', color: 'Blanco', stock: 4, precio: 39.9, sku: 'POL-BAS-ALG-BLA-L', imagen: 'assets/images/products/polos/polo-basico-negro.jpg' },
      { id: 110, talla: 'M', color: 'Azul', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-AZU-M', imagen: 'assets/images/products/polos/polo-basico-azul.jpg' },
      { id: 111, talla: 'L', color: 'Azul', stock: 4, precio: 39.9, sku: 'POL-BAS-ALG-AZU-L', imagen: 'assets/images/products/polos/polo-basico-azul.jpg' },
      { id: 112, talla: 'M', color: 'Rojo', stock: 5, precio: 39.9, sku: 'POL-BAS-ALG-ROJ-M', imagen: 'assets/images/products/polos/polo-basico-rojo.jpg' },
      { id: 113, talla: 'L', color: 'Rojo', stock: 4, precio: 39.9, sku: 'POL-BAS-ALG-ROJ-L', imagen: 'assets/images/products/polos/polo-basico-rojo.jpg' }
    ],
    imagenes: [
      { url: 'assets/images/products/polos/polo-basico-negro.jpg', alt: 'Polo Básico Algodón - Negro', orden: 1 },
      { url: 'assets/images/products/polos/polo-basico-negro.jpg', alt: 'Polo Básico Algodón - Blanco', orden: 2 },
      { url: 'assets/images/products/polos/polo-basico-azul.jpg', alt: 'Polo Básico Algodón - Azul', orden: 3 },
      { url: 'assets/images/products/polos/polo-basico-rojo.jpg', alt: 'Polo Básico Algodón - Rojo', orden: 4 }
    ]
  },
  {
    id: 2,
    sku: 'JEA-CLA-AZU-30',
    nombre: 'Jean Clásico',
    descripcion: 'Jean de corte clásico con caída moderna y comodidad para uso diario.',
    precio: 89.9,
    stock: 28,
    categoria: 'Pantalones',
    genero: 'hombre',
    talla: '30',
    color: 'Azul',
    imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg',
    imagenPrincipal: 'assets/images/products/pantalones/jean-clasico-azul.jpg',
    activo: true,
    colores: ['Azul', 'Negro', 'Beige', 'Gris'],
    tallas: ['28', '30', '32', '34'],
    variantes: [
      { id: 201, talla: '28', color: 'Azul', stock: 6, precio: 89.9, sku: 'JEA-CLA-AZU-28', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 202, talla: '30', color: 'Azul', stock: 7, precio: 89.9, sku: 'JEA-CLA-AZU-30', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 203, talla: '32', color: 'Azul', stock: 5, precio: 99.9, sku: 'JEA-CLA-AZU-32', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 204, talla: '30', color: 'Negro', stock: 6, precio: 99.9, sku: 'JEA-CLA-NEG-30', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 205, talla: '32', color: 'Negro', stock: 4, precio: 99.9, sku: 'JEA-CLA-NEG-32', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 206, talla: '30', color: 'Beige', stock: 5, precio: 109.9, sku: 'JEA-CLA-BEI-30', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 207, talla: '32', color: 'Beige', stock: 4, precio: 109.9, sku: 'JEA-CLA-BEI-32', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 208, talla: '30', color: 'Gris', stock: 5, precio: 109.9, sku: 'JEA-CLA-GRI-30', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' },
      { id: 209, talla: '32', color: 'Gris', stock: 4, precio: 109.9, sku: 'JEA-CLA-GRI-32', imagen: 'assets/images/products/pantalones/jean-clasico-azul.jpg' }
    ],
    imagenes: [
      { url: 'assets/images/products/pantalones/jean-clasico-azul.jpg', alt: 'Jean clásico azul', orden: 1 },
      { url: 'assets/images/products/pantalones/jean-clasico-azul.jpg', alt: 'Jean clásico negro', orden: 2 },
      { url: 'assets/images/products/pantalones/jean-clasico-azul.jpg', alt: 'Jean clásico beige', orden: 3 },
      { url: 'assets/images/products/pantalones/jean-clasico-azul.jpg', alt: 'Jean clásico gris', orden: 4 }
    ]
  },
  {
    id: 3,
    sku: 'VES-CAS-AZU-S',
    nombre: 'Vestido Casual',
    descripcion: 'Vestido ligero con silueta elegante y atención a los detalles.',
    precio: 109.9,
    stock: 18,
    categoria: 'Vestidos',
    genero: 'mujer',
    talla: 'S',
    color: 'Azul',
    imagen: 'assets/images/products/vestidos/vestido-casual-azul.png',
    imagenPrincipal: 'assets/images/products/vestidos/vestido-casual-azul.png',
    activo: true,
    colores: ['Azul', 'Negro', 'Rojo', 'Beige'],
    tallas: ['S', 'M', 'L'],
    variantes: [
      { id: 301, talla: 'S', color: 'Azul', stock: 4, precio: 109.9, sku: 'VES-CAS-AZU-S', imagen: 'assets/images/products/vestidos/vestido-casual-azul.png' },
      { id: 302, talla: 'M', color: 'Azul', stock: 3, precio: 109.9, sku: 'VES-CAS-AZU-M', imagen: 'assets/images/products/vestidos/vestido-casual-azul.png' },
      { id: 303, talla: 'L', color: 'Azul', stock: 2, precio: 119.9, sku: 'VES-CAS-AZU-L', imagen: 'assets/images/products/vestidos/vestido-casual-azul.png' },
      { id: 304, talla: 'S', color: 'Negro', stock: 3, precio: 109.9, sku: 'VES-CAS-NEG-S', imagen: 'assets/images/products/vestidos/vestido-casual-negro.png' },
      { id: 305, talla: 'M', color: 'Negro', stock: 2, precio: 109.9, sku: 'VES-CAS-NEG-M', imagen: 'assets/images/products/vestidos/vestido-casual-negro.png' },
      { id: 306, talla: 'L', color: 'Negro', stock: 2, precio: 119.9, sku: 'VES-CAS-NEG-L', imagen: 'assets/images/products/vestidos/vestido-casual-negro.png' },
      { id: 307, talla: 'S', color: 'Rojo', stock: 2, precio: 109.9, sku: 'VES-CAS-ROJ-S', imagen: 'assets/images/products/vestidos/vestido-casual-rojo.jpg' },
      { id: 308, talla: 'M', color: 'Rojo', stock: 3, precio: 109.9, sku: 'VES-CAS-ROJ-M', imagen: 'assets/images/products/vestidos/vestido-casual-rojo.jpg' },
      { id: 309, talla: 'L', color: 'Rojo', stock: 2, precio: 119.9, sku: 'VES-CAS-ROJ-L', imagen: 'assets/images/products/vestidos/vestido-casual-rojo.jpg' },
      { id: 310, talla: 'S', color: 'Beige', stock: 2, precio: 109.9, sku: 'VES-CAS-BEI-S', imagen: 'assets/images/products/vestidos/vestido-casual-beige.png' },
      { id: 311, talla: 'M', color: 'Beige', stock: 3, precio: 109.9, sku: 'VES-CAS-BEI-M', imagen: 'assets/images/products/vestidos/vestido-casual-beige.png' },
      { id: 312, talla: 'L', color: 'Beige', stock: 2, precio: 119.9, sku: 'VES-CAS-BEI-L', imagen: 'assets/images/products/vestidos/vestido-casual-beige.png' }
    ],
    imagenes: [
      { url: 'assets/images/products/vestidos/vestido-casual-azul.png', alt: 'Vestido Casual azul', orden: 1 },
      { url: 'assets/images/products/vestidos/vestido-casual-negro.png', alt: 'Vestido Casual negro', orden: 2 },
      { url: 'assets/images/products/vestidos/vestido-casual-rojo.jpg', alt: 'Vestido Casual rojo', orden: 3 },
      { url: 'assets/images/products/vestidos/vestido-casual-beige.png', alt: 'Vestido Casual beige', orden: 4 }
    ]
  },
  {
    id: 8,
    sku: 'ZAP-CAS-BLA-40',
    nombre: 'Zapatilla Casual',
    descripcion: 'Zapatilla casual con silueta limpia, suela ligera y estilo versátil para uso diario.',
    precio: 129.9,
    stock: 30,
    categoria: 'Zapatos',
    genero: 'unisex',
    talla: '40',
    color: 'Blanco',
    imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png',
    imagenPrincipal: 'assets/images/products/zapatos/zapatilla-casual-blanca.png',
    activo: true,
    colores: ['Blanco', 'Negro', 'Rosa', 'Azul'],
    tallas: ['36', '37', '38', '39', '40', '41', '42', '43'],
    variantes: [
      { id: 801, talla: '36', color: 'Blanco', stock: 3, precio: 129.9, sku: 'ZAP-CAS-BLA-36', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 802, talla: '37', color: 'Blanco', stock: 4, precio: 129.9, sku: 'ZAP-CAS-BLA-37', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 803, talla: '38', color: 'Blanco', stock: 3, precio: 129.9, sku: 'ZAP-CAS-BLA-38', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 804, talla: '39', color: 'Blanco', stock: 2, precio: 129.9, sku: 'ZAP-CAS-BLA-39', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 805, talla: '40', color: 'Blanco', stock: 2, precio: 129.9, sku: 'ZAP-CAS-BLA-40', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 806, talla: '41', color: 'Blanco', stock: 2, precio: 129.9, sku: 'ZAP-CAS-BLA-41', imagen: 'assets/images/products/zapatos/zapatilla-casual-blanca.png' },
      { id: 807, talla: '36', color: 'Negro', stock: 3, precio: 129.9, sku: 'ZAP-CAS-NEG-36', imagen: 'assets/images/products/zapatos/zapatilla-casual-negra.png' },
      { id: 808, talla: '38', color: 'Negro', stock: 4, precio: 129.9, sku: 'ZAP-CAS-NEG-38', imagen: 'assets/images/products/zapatos/zapatilla-casual-negra.png' },
      { id: 809, talla: '40', color: 'Negro', stock: 2, precio: 129.9, sku: 'ZAP-CAS-NEG-40', imagen: 'assets/images/products/zapatos/zapatilla-casual-negra.png' },
      { id: 810, talla: '42', color: 'Negro', stock: 2, precio: 129.9, sku: 'ZAP-CAS-NEG-42', imagen: 'assets/images/products/zapatos/zapatilla-casual-negra.png' },
      { id: 811, talla: '37', color: 'Rosa', stock: 3, precio: 139.9, sku: 'ZAP-CAS-ROS-37', imagen: 'assets/images/products/zapatos/zapatilla-casual-rosa.png' },
      { id: 812, talla: '39', color: 'Rosa', stock: 4, precio: 139.9, sku: 'ZAP-CAS-ROS-39', imagen: 'assets/images/products/zapatos/zapatilla-casual-rosa.png' },
      { id: 813, talla: '40', color: 'Rosa', stock: 3, precio: 139.9, sku: 'ZAP-CAS-ROS-40', imagen: 'assets/images/products/zapatos/zapatilla-casual-rosa.png' },
      { id: 814, talla: '42', color: 'Rosa', stock: 2, precio: 139.9, sku: 'ZAP-CAS-ROS-42', imagen: 'assets/images/products/zapatos/zapatilla-casual-rosa.png' },
      { id: 815, talla: '36', color: 'Azul', stock: 3, precio: 139.9, sku: 'ZAP-CAS-AZU-36', imagen: 'assets/images/products/zapatos/zapatilla-casual-azul.png' },
      { id: 816, talla: '38', color: 'Azul', stock: 4, precio: 139.9, sku: 'ZAP-CAS-AZU-38', imagen: 'assets/images/products/zapatos/zapatilla-casual-azul.png' },
      { id: 817, talla: '40', color: 'Azul', stock: 4, precio: 139.9, sku: 'ZAP-CAS-AZU-40', imagen: 'assets/images/products/zapatos/zapatilla-casual-azul.png' },
      { id: 818, talla: '41', color: 'Azul', stock: 2, precio: 139.9, sku: 'ZAP-CAS-AZU-41', imagen: 'assets/images/products/zapatos/zapatilla-casual-azul.png' },
      { id: 819, talla: '43', color: 'Azul', stock: 2, precio: 139.9, sku: 'ZAP-CAS-AZU-43', imagen: 'assets/images/products/zapatos/zapatilla-casual-azul.png' }
    ],
    imagenes: [
      { url: 'assets/images/products/zapatos/zapatilla-casual-blanca.png', alt: 'Zapatilla Casual blanca', orden: 1 },
      { url: 'assets/images/products/zapatos/zapatilla-casual-negra.png', alt: 'Zapatilla Casual negra', orden: 2 },
      { url: 'assets/images/products/zapatos/zapatilla-casual-rosa.png', alt: 'Zapatilla Casual rosa', orden: 3 },
      { url: 'assets/images/products/zapatos/zapatilla-casual-azul.png', alt: 'Zapatilla Casual azul', orden: 4 }
    ]
  },
  {
    id: 6,
    sku: 'BLU-BAS-AZU-XS',
    nombre: 'Blusa Básica',
    descripcion: 'Blusa básica en tres colores con corte elegante, manga larga y ajuste cómodo para todos los días.',
    precio: 49.9,
    stock: 18,
    categoria: 'Blusas',
    genero: 'mujer',
    talla: 'XS',
    color: 'Azul',
    imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg',
    imagenPrincipal: 'assets/images/products/blusas/blusa-basica-azul.jpg',
    activo: true,
    colores: ['Azul', 'Blanco', 'Rosa'],
    tallas: ['XS', 'S', 'M', 'L', 'XL'],
    variantes: [
      { id: 601, talla: 'XS', color: 'Azul', stock: 3, precio: 49.9, sku: 'BLU-BAS-AZU-XS', imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg' },
      { id: 602, talla: 'S', color: 'Azul', stock: 3, precio: 49.9, sku: 'BLU-BAS-AZU-S', imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg' },
      { id: 603, talla: 'M', color: 'Azul', stock: 2, precio: 49.9, sku: 'BLU-BAS-AZU-M', imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg' },
      { id: 604, talla: 'L', color: 'Azul', stock: 2, precio: 49.9, sku: 'BLU-BAS-AZU-L', imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg' },
      { id: 605, talla: 'XL', color: 'Azul', stock: 1, precio: 49.9, sku: 'BLU-BAS-AZU-XL', imagen: 'assets/images/products/blusas/blusa-basica-azul.jpg' },
      { id: 606, talla: 'XS', color: 'Blanco', stock: 3, precio: 49.9, sku: 'BLU-BAS-BLA-XS', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg' },
      { id: 607, talla: 'S', color: 'Blanco', stock: 3, precio: 49.9, sku: 'BLU-BAS-BLA-S', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg' },
      { id: 608, talla: 'M', color: 'Blanco', stock: 2, precio: 49.9, sku: 'BLU-BAS-BLA-M', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg' },
      { id: 609, talla: 'L', color: 'Blanco', stock: 2, precio: 49.9, sku: 'BLU-BAS-BLA-L', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg' },
      { id: 610, talla: 'XL', color: 'Blanco', stock: 1, precio: 49.9, sku: 'BLU-BAS-BLA-XL', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg' },
      { id: 611, talla: 'XS', color: 'Rosa', stock: 2, precio: 54.9, sku: 'BLU-BAS-ROS-XS', imagen: 'assets/images/products/blusas/blusa-rosa.png' },
      { id: 612, talla: 'S', color: 'Rosa', stock: 3, precio: 54.9, sku: 'BLU-BAS-ROS-S', imagen: 'assets/images/products/blusas/blusa-rosa.png' },
      { id: 613, talla: 'M', color: 'Rosa', stock: 2, precio: 54.9, sku: 'BLU-BAS-ROS-M', imagen: 'assets/images/products/blusas/blusa-rosa.png' },
      { id: 614, talla: 'L', color: 'Rosa', stock: 2, precio: 54.9, sku: 'BLU-BAS-ROS-L', imagen: 'assets/images/products/blusas/blusa-rosa.png' },
      { id: 615, talla: 'XL', color: 'Rosa', stock: 1, precio: 54.9, sku: 'BLU-BAS-ROS-XL', imagen: 'assets/images/products/blusas/blusa-rosa.png' }
    ],
    imagenes: [
      { url: 'assets/images/products/blusas/blusa-basica-azul.jpg', alt: 'Blusa Básica azul', orden: 1 },
      { url: 'assets/images/products/blusas/blusa-basica-blanca.jpg', alt: 'Blusa Básica blanca', orden: 2 },
      { url: 'assets/images/products/blusas/blusa-rosa.png', alt: 'Blusa Básica rosa', orden: 3 }
    ]
  },
  {
    id: 7,
    sku: 'POL-BAS-NEGRO-M',
    nombre: 'Polera Básica',
    descripcion: 'Polera básica con silueta cómoda, un ajuste sobrio y una calidad premium para uso diario.',
    precio: 59.9,
    stock: 18,
    categoria: 'Poleras',
    genero: 'unisex',
    talla: 'M',
    color: 'Negro',
    imagen: 'assets/images/products/poleras/polera-basica-negra.png',
    imagenPrincipal: 'assets/images/products/poleras/polera-basica-negra.png',
    activo: true,
    colores: ['Negro', 'Gris'],
    tallas: ['XS', 'S', 'M', 'L', 'XL'],
    variantes: [
      { id: 701, talla: 'XS', color: 'Negro', stock: 3, precio: 59.9, sku: 'POL-BAS-NEGRO-XS', imagen: 'assets/images/products/poleras/polera-basica-negra.png' },
      { id: 702, talla: 'S', color: 'Negro', stock: 4, precio: 59.9, sku: 'POL-BAS-NEGRO-S', imagen: 'assets/images/products/poleras/polera-basica-negra.png' },
      { id: 703, talla: 'M', color: 'Negro', stock: 4, precio: 59.9, sku: 'POL-BAS-NEGRO-M', imagen: 'assets/images/products/poleras/polera-basica-negra.png' },
      { id: 704, talla: 'L', color: 'Negro', stock: 3, precio: 59.9, sku: 'POL-BAS-NEGRO-L', imagen: 'assets/images/products/poleras/polera-basica-negra.png' },
      { id: 705, talla: 'XL', color: 'Negro', stock: 2, precio: 59.9, sku: 'POL-BAS-NEGRO-XL', imagen: 'assets/images/products/poleras/polera-basica-negra.png' },
      { id: 706, talla: 'XS', color: 'Gris', stock: 3, precio: 64.9, sku: 'POL-BAS-GRIS-XS', imagen: 'assets/images/products/poleras/polera-basica-gris.png' },
      { id: 707, talla: 'S', color: 'Gris', stock: 4, precio: 64.9, sku: 'POL-BAS-GRIS-S', imagen: 'assets/images/products/poleras/polera-basica-gris.png' },
      { id: 708, talla: 'M', color: 'Gris', stock: 4, precio: 64.9, sku: 'POL-BAS-GRIS-M', imagen: 'assets/images/products/poleras/polera-basica-gris.png' },
      { id: 709, talla: 'L', color: 'Gris', stock: 2, precio: 64.9, sku: 'POL-BAS-GRIS-L', imagen: 'assets/images/products/poleras/polera-basica-gris.png' },
      { id: 710, talla: 'XL', color: 'Gris', stock: 2, precio: 64.9, sku: 'POL-BAS-GRIS-XL', imagen: 'assets/images/products/poleras/polera-basica-gris.png' }
    ],
    imagenes: [
      { url: 'assets/images/products/poleras/polera-basica-negra.png', alt: 'Polera Básica negra', orden: 1 },
      { url: 'assets/images/products/poleras/polera-basica-gris.png', alt: 'Polera Básica gris', orden: 2 }
    ]
  }
];

function esProductoRetirado(producto: Producto): boolean {
  const nombre = (producto.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return nombre === 'blusa elegante' || nombre === 'zapatilla urbana';
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private http = inject(HttpClient);
  private api = 'http://localhost:8082';

  private obtenerProductosDemo(): Producto[] {
    return DEMO_PRODUCTOS.filter(producto => !esProductoRetirado(producto)).map(producto => normalizarImagenesProducto(producto));
  }

  private obtenerProductoDemo(id: number): Producto | undefined {
    return this.obtenerProductosDemo().find(producto => producto.id === id);
  }

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos`).pipe(
      map(productos => Array.isArray(productos)
        ? productos.filter(producto => !esProductoRetirado(producto)).map(normalizarImagenesProducto)
        : []),
      catchError(() => of(this.obtenerProductosDemo()))
    );
  }

  detalle(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.api}/productos/${id}`).pipe(
      map(producto => {
        if (esProductoRetirado(producto)) throw new Error('Esta prenda ya no forma parte del catálogo.');
        return normalizarImagenesProducto(producto);
      }),
      catchError(() => {
        const producto = this.obtenerProductoDemo(id);
        return producto ? of(producto) : throwError(() => new Error('Esta prenda ya no forma parte del catálogo.'));
      })
    );
  }

  recomendaciones(categoria: string, talla: string, color: string): Observable<RecomendacionProducto> {
    return this.http.get<RecomendacionProducto>(`${this.api}/recomendaciones`, {
      params: { categoria, talla, color }
    }).pipe(
      catchError(() => of({
        categoria,
        talla,
        color,
        mensaje: 'Estilo versátil para tu próxima compra.'
      }))
    );
  }

  agregar(producto: Producto): Observable<object> {
    return this.http.post(`${this.api}/productos`, producto);
  }

  editar(producto: Producto): Observable<object> {
    return this.http.post(`${this.api}/productos/editar`, producto);
  }

  eliminar(id: number): Observable<object> {
    return this.http.delete(`${this.api}/productos/${id}`);
  }
}
