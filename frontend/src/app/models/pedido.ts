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
  direccionEnvio?: string;
  metodoPago?: string;
}

export interface RotacionProducto {
  productoId: number;
  nombre: string;
  sku: string;
  unidadesVendidas: number;
}

export interface VentaDia {
  dia: string;
  fecha: string;
  total: number;
  pedidos: number;
  porcentaje: number;
}

export interface TopProductoVenta {
  productoId: number;
  nombre: string;
  sku: string;
  categoria: string;
  imagen?: string;
  precio: number;
  unidadesVendidas: number;
  totalRecaudado: number;
  porcentaje: number;
  ranking: number;
}

export interface ResumenMetricas {
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  ventasHoy: number;
  pedidosHoy: number;
  ventasAyer: number;
  pedidosPorEstado: {
    preparando: number;
    enCamino: number;
    entregado: number;
    cancelado: number;
  };
}

export interface MetricasDashboard {
  resumen: ResumenMetricas;
  ventasPorDia: VentaDia[];
  topProductos: TopProductoVenta[];
  pedidosRecientes: Pedido[];
}
