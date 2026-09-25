import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Producto, VarianteProducto } from '../../models/producto';
import { AuthService } from '../../services/auth';
import { PedidoService } from '../../services/pedido';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tienda.html',
  styleUrl: './tienda.scss',
})
export class Tienda {
  private readonly productosService = inject(ProductoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pedidoService = inject(PedidoService);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  categoria = 'Todas';
  cargando = true;
  carritoAbierto = false;
  productoSeleccionado: Producto | null = null;
  varianteSeleccionada: VarianteProducto | null = null;
  nombreCliente = '';
  direccionEnvio = '';
  metodoPago = 'Efectivo';
  procesandoPedido = false;
  mensajePedido = '';
  errorPedido = '';

  constructor() {
    this.nombreCliente = this.auth.usuarioActual();
    this.productosService.listar().subscribe({
      next: productos => { this.productos = productos; this.cargando = false; },
      error: () => this.cargando = false,
    });
  }

  get categorias(): string[] {
    return ['niños', 'niñas', 'mujeres', 'varones'];
  }

  get destacados(): Producto[] {
    return this.productos.slice(0, 3);
  }

  imagen(producto: Producto): string {
    return producto.imagen || 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=85';
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  irCategoria(categoria: string): void {
    this.router.navigate(['/tienda/categoria', categoria]);
  }

  alternarCarrito(): void { this.carritoAbierto = !this.carritoAbierto; }
  abrirDetalle(producto: Producto): void {
    this.productosService.detalle(producto.id).subscribe({
      next: detalle => {
        this.productoSeleccionado = detalle;
        this.varianteSeleccionada = detalle.variantes?.[0] || null;
      },
    });
  }
  cerrarDetalle(): void { this.productoSeleccionado = null; this.varianteSeleccionada = null; }
  seleccionarVariante(variante: VarianteProducto): void { this.varianteSeleccionada = variante; }
  agregarAlCarrito(producto: Producto, variante?: VarianteProducto): void {
    const agregada = this.carrito.agregar(producto, variante || producto.variantes?.[0]);
    if (agregada) {
      this.carritoAbierto = true;
      this.cerrarDetalle();
    }
  }

  confirmarCompra(): void {
    this.errorPedido = '';
    this.mensajePedido = '';
    if (!this.carrito.items.length) {
      this.errorPedido = 'Tu carrito está vacío.';
      return;
    }
    if (!this.direccionEnvio.trim()) {
      this.errorPedido = 'Ingresa la dirección de entrega.';
      return;
    }

    this.procesandoPedido = true;
    const cliente = (this.nombreCliente || this.auth.usuarioActual() || 'Cliente').trim();
    this.pedidoService.crear(
      cliente,
      this.carrito.aPedidoItems(),
      this.direccionEnvio,
      this.metodoPago
    ).subscribe({
      next: pedido => {
        this.mensajePedido = `Pedido #${pedido.id} registrado correctamente. Método de pago: ${this.metodoPago}.`;
        this.carrito.limpiar();
        this.direccionEnvio = '';
        this.metodoPago = 'Efectivo';
        this.procesandoPedido = false;
        this.carritoAbierto = false;
      },
      error: response => {
        this.errorPedido = response.error?.error || 'No se pudo registrar el pedido.';
        this.procesandoPedido = false;
      },
    });
  }
}