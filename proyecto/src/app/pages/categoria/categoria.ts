import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Producto } from '../../models/producto';
import { AuthService } from '../../services/auth';
import { PedidoService } from '../../services/pedido';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './categoria.html',
  styleUrl: './categoria.scss',
})
export class Categoria {
  private readonly productosService = inject(ProductoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  categoria = '';
  cargando = true;
  carritoAbierto = false;
  nombreCliente = '';
  direccionEnvio = '';
  procesandoPedido = false;
  mensajePedido = '';
  errorPedido = '';

  constructor() {
    this.nombreCliente = this.auth.usuarioActual();
    this.categoria = this.route.snapshot.paramMap.get('categoria') || 'mujeres';
    this.productosService.listar().subscribe({
      next: productos => { this.productos = this.filtrarGenero(productos, this.categoria).slice(0, 15); this.cargando = false; },
      error: () => this.cargando = false,
    });
  }

  get titulo(): string { return this.categoria.charAt(0).toUpperCase() + this.categoria.slice(1); }
  get categorias(): string[] { return ['niños', 'niñas', 'mujeres', 'varones']; }
  imagen(producto: Producto): string { return producto.imagen || 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=85'; }
  cambiarCategoria(valor: string): void { this.router.navigate(['/tienda/categoria', valor]); this.categoria = valor; this.cargando = true; this.productosService.listar().subscribe({ next: productos => { this.productos = this.filtrarGenero(productos, valor).slice(0, 15); this.cargando = false; }, error: () => this.cargando = false }); }
  private filtrarGenero(productos: Producto[], valor: string): Producto[] {
    const equivalencias: Record<string, string[]> = { mujeres: ['mujer', 'mujeres'], varones: ['hombre', 'varones'], niñas: ['niña', 'niñas'], niños: ['niño', 'niños'] };
    return productos.filter(producto => equivalencias[valor]?.includes(producto.genero || '') || producto.genero === valor);
  }
  cerrarSesion(): void { this.auth.cerrarSesion(); this.router.navigate(['/']); }
  alternarCarrito(): void { this.carritoAbierto = !this.carritoAbierto; }
  agregarAlCarrito(producto: Producto): void {
    if (this.carrito.agregar(producto, producto.variantes?.[0])) this.carritoAbierto = true;
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
    this.pedidoService.crear(cliente, this.carrito.aPedidoItems()).subscribe({
      next: pedido => {
        this.mensajePedido = `Pedido #${pedido.id} registrado correctamente.`;
        this.carrito.limpiar();
        this.direccionEnvio = '';
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
