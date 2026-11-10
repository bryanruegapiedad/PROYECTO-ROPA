import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductoService } from '../../services/producto';
import { PedidoService } from '../../services/pedido';
import { AuthService } from '../../services/auth';
import { Producto } from '../../models/producto';
import { MetricasDashboard, Pedido, TopProductoVenta, VentaDia } from '../../models/pedido';
import { imagenDePrenda } from '../../models/imagen-prenda';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly productosService = inject(ProductoService);
  private readonly pedidosService = inject(PedidoService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  metricas: MetricasDashboard | null = null;
  cargando = true;
  guardandoEstadoId: number | null = null;
  mensajeToast = '';
  fechaActual = new Date();

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargando = true;
    this.cdr.detectChanges();

    // 1. Cargar catálogo de productos
    this.productosService.listar().subscribe({
      next: (prods) => {
        this.productos = prods || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.productos = [];
      }
    });

    // 2. Cargar métricas de ventas y rotación
    this.pedidosService.metricas().subscribe({
      next: (data) => {
        this.metricas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback de métricas si el endpoint responde con error
        this.cargarFallback();
      }
    });
  }

  private cargarFallback(): void {
    this.pedidosService.listar().subscribe({
      next: (pedidos) => {
        const totalVentas = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);
        this.metricas = {
          resumen: {
            totalVentas,
            totalPedidos: pedidos.length,
            ticketPromedio: pedidos.length ? Math.round((totalVentas / pedidos.length) * 100) / 100 : 0,
            ventasHoy: 0,
            pedidosHoy: 0,
            ventasAyer: 0,
            pedidosPorEstado: { preparando: 0, enCamino: 0, entregado: 0, cancelado: 0 }
          },
          ventasPorDia: [],
          topProductos: [],
          pedidosRecientes: pedidos.slice(0, 8)
        };
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get totalStock(): number {
    return this.productos.reduce((total, producto) => total + (producto.stock || 0), 0);
  }

  get stockBajo(): number {
    return this.productos.filter(producto => producto.stock < 10).length;
  }

  get valorInventario(): number {
    return this.productos.reduce((total, producto) => total + (producto.precio || 0) * (producto.stock || 0), 0);
  }

  get totalVentas(): number {
    return this.metricas?.resumen.totalVentas || 0;
  }

  get totalPedidos(): number {
    return this.metricas?.resumen.totalPedidos || 0;
  }

  get ticketPromedio(): number {
    return this.metricas?.resumen.ticketPromedio || 0;
  }

  get ventasHoy(): number {
    return this.metricas?.resumen.ventasHoy || 0;
  }

  get pedidosHoy(): number {
    return this.metricas?.resumen.pedidosHoy || 0;
  }

  get ventasPorDia(): VentaDia[] {
    return this.metricas?.ventasPorDia || [];
  }

  get topProductos(): TopProductoVenta[] {
    return this.metricas?.topProductos || [];
  }

  get pedidosRecientes(): Pedido[] {
    return this.metricas?.pedidosRecientes || [];
  }

  imagenProducto(item: any): string {
    if (item?.imagen && String(item.imagen).startsWith('http')) return item.imagen;
    return imagenDePrenda(item);
  }

  cambiarEstado(pedido: Pedido, nuevoEstado: string): void {
    if (pedido.estado === nuevoEstado) return;
    this.guardandoEstadoId = pedido.id;
    this.pedidosService.actualizarEstado(pedido.id, nuevoEstado).subscribe({
      next: () => {
        pedido.estado = nuevoEstado;
        this.guardandoEstadoId = null;
        this.mostrarToast(`Pedido #${pedido.id} actualizado a "${nuevoEstado}"`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoEstadoId = null;
        this.mostrarToast(`No se pudo actualizar el estado del pedido #${pedido.id}`);
        this.cdr.detectChanges();
      }
    });
  }

  mostrarToast(mensaje: string): void {
    this.mensajeToast = mensaje;
    setTimeout(() => {
      this.mensajeToast = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  formatoFecha(fechaStr?: string): string {
    if (!fechaStr) return 'Reciente';
    try {
      const d = new Date(fechaStr);
      const hoy = new Date();
      const esHoy = d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
      const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      if (esHoy) return `Hoy, ${hora}`;
      return `${d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}, ${hora}`;
    } catch {
      return fechaStr;
    }
  }

  irTienda(): void {
    this.router.navigate(['/tienda']);
  }

  irProductos(): void {
    this.router.navigate(['/productos']);
  }

  irPedidos(): void {
    this.router.navigate(['/pedidos']);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }
}
