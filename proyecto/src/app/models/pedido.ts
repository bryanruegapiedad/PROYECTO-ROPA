export interface PedidoItem {
  productoId: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: number;
  cliente: string;
  items: PedidoItem[];
  total: number;
  estado: string;
  fecha: string;
  entregaEstimada: string;
}

export interface RotacionProducto {
  productoId: number;
  nombre: string;
  sku: string;
  unidadesVendidas: number;
}