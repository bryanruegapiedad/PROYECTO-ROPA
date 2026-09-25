export interface VarianteProducto {
  id: number;
  talla: string;
  color: string;
  stock: number;
  precio: number;
  sku: string;
}

export interface ImagenProducto {
  url: string;
  alt: string;
  orden: number;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoria: string;
  genero?: string;
  talla: string;
  color: string;
  imagen: string;
  activo: boolean;
  variantes?: VarianteProducto[];
  imagenes?: ImagenProducto[];
}