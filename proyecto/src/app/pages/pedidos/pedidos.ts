import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Producto } from '../../models/producto';
import { Pedido, RotacionProducto } from '../../models/pedido';
import { PedidoService } from '../../services/pedido';
import { ProductoService } from '../../services/producto';

interface LineaPedido {
  productoId: number;
  varianteId?: number;
  cantidad: number;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.scss',
})
export class Pedidos {
  private readonly pedidosService = inject(PedidoService);
  private readonly productosService = inject(ProductoService);
  private readonly router = inject(Router);

  productos: Producto[] = [];
  pedidos: Pedido[] = [];
  rotacion: RotacionProducto[] = [];
  cliente = '';
  productoSeleccionadoId = 0;
  cantidad = 1;
  lineas: LineaPedido[] = [];
  cargando = true;
  guardando = false;
  mensaje = '';
  error = '';

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.productosService.listar().subscribe({
      next: productos => this.productos = productos.filter(producto => producto.activo),
      error: () => this.error = 'No se pudo cargar el catálogo.',
    });
    this.pedidosService.listar().subscribe({
      next: pedidos => { this.pedidos = pedidos; this.cargando = false; },
      error: () => { this.error = 'No se pudieron cargar los pedidos.'; this.cargando = false; },
    });
    this.pedidosService.rotacion().subscribe({
      next: rotacion => this.rotacion = rotacion,
      error: () => this.error = 'No se pudo calcular la rotación.',
    });
  }

  agregarLinea(): void {
    const productoId = Number(this.productoSeleccionadoId);
    const producto = this.productos.find(item => item.id === productoId);
    if (!producto || this.cantidad < 1) return;
    const existente = this.lineas.find(item => item.productoId === productoId);
    if (existente) existente.cantidad += this.cantidad;
    else this.lineas.push({ productoId, cantidad: this.cantidad });
    this.productoSeleccionadoId = 0;
    this.cantidad = 1;
  }

  quitarLinea(productoId: number): void {
    this.lineas = this.lineas.filter(item => item.productoId !== productoId);
  }

  nombreProducto(productoId: number): string {
    return this.productos.find(item => item.id === productoId)?.nombre || 'Producto';
  }

  precioProducto(productoId: number): number {
    return this.productos.find(item => item.id === productoId)?.precio || 0;
  }

  get totalPedido(): number {
    return this.lineas.reduce((total, linea) => total + this.precioProducto(linea.productoId) * linea.cantidad, 0);
  }

  get productoLider(): RotacionProducto | undefined {
    return this.rotacion[0];
  }

  porcentajeRotacion(item: RotacionProducto): number {
    const maximo = this.productoLider?.unidadesVendidas || 1;
    return item.unidadesVendidas ? Math.max(8, item.unidadesVendidas / maximo * 100) : 3;
  }

  crearPedido(): void {
    this.error = '';
    this.mensaje = '';
    if (!this.cliente.trim() || !this.lineas.length) {
      this.error = 'Indica el cliente y agrega al menos un producto.';
      return;
    }
    this.guardando = true;
    const items = this.lineas.map(linea => ({
      varianteId: linea.varianteId || linea.productoId,
      cantidad: linea.cantidad,
    }));
    this.pedidosService.crear(this.cliente.trim(), items).subscribe({
      next: pedido => {
        this.pedidos = [pedido, ...this.pedidos];
        this.lineas = [];
        this.cliente = '';
        this.guardando = false;
        this.mensaje = `Pedido #${pedido.id} creado. Entrega estimada: ${this.fecha(pedido.entregaEstimada)}.`;
        this.cargar();
      },
      error: response => {
        this.error = response.error?.error || 'No se pudo crear el pedido.';
        this.guardando = false;
      },
    });
  }

  fecha(valor: string): string {
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(valor));
  }

  irDashboard(): void { this.router.navigate(['/dashboard']); }
  irProductos(): void { this.router.navigate(['/productos']); }
}
