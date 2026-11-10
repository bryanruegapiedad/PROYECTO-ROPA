import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Producto } from '../../models/producto';
import { AuthService } from '../../services/auth';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';
import { CarritoDrawer } from '../../components/carrito-drawer/carrito-drawer';

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule, RouterModule, CarritoDrawer],
  templateUrl: './categoria.html',
  styleUrl: './categoria.scss',
})
export class Categoria {
  private readonly productosService = inject(ProductoService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  categoria = '';
  cargando = true;
  carritoAbierto = false;

  constructor() {
    this.categoria = this.route.snapshot.paramMap.get('categoria') || 'mujeres';
    this.productosService.listar().subscribe({
      next: productos => { this.productos = this.filtrarGenero(productos, this.categoria).slice(0, 15); this.cargando = false; },
      error: () => this.cargando = false,
    });
  }

  get titulo(): string { return this.categoria.charAt(0).toUpperCase() + this.categoria.slice(1); }
  get categorias(): string[] { return ['niños', 'niñas', 'mujeres', 'varones']; }
  imagen(producto: Producto): string {
    const fallback = 'assets/images/products/polos/polo-basico-negro.jpg';
    if (producto.imagen?.trim()) return producto.imagen;
    if (producto.imagenPrincipal?.trim()) return producto.imagenPrincipal;
    const nombre = (producto.nombre || '').toLowerCase();
    if (nombre.includes('jean') || nombre.includes('pantal')) return 'assets/images/products/pantalones/jean-clasico-azul.jpg';
    if (nombre.includes('polera')) return 'assets/images/products/poleras/polera-basica-negra.png';
    if (nombre.includes('blusa')) return 'assets/images/products/blusas/blusa-basica-azul.jpg';
    if (nombre.includes('vestido')) return 'assets/images/products/vestidos/vestido-casual-rojo.jpg';
    return fallback;
  }
  cambiarCategoria(valor: string): void { this.router.navigate(['/tienda/categoria', valor]); this.categoria = valor; this.cargando = true; this.productosService.listar().subscribe({ next: productos => { this.productos = this.filtrarGenero(productos, valor).slice(0, 15); this.cargando = false; }, error: () => this.cargando = false }); }
  private filtrarGenero(productos: Producto[], valor: string): Producto[] {
    const equivalencias: Record<string, string[]> = { mujeres: ['mujer', 'mujeres'], varones: ['hombre', 'varones'], niñas: ['niña', 'niñas'], niños: ['niño', 'niños'] };
    return productos.filter(producto => equivalencias[valor]?.includes(producto.genero || '') || producto.genero === valor);
  }
  cerrarSesion(): void { this.auth.cerrarSesion(); this.router.navigate(['/']); }
  alternarCarrito(): void { this.carritoAbierto = !this.carritoAbierto; }
  cerrarCarrito(): void { this.carritoAbierto = false; }
  agregarAlCarrito(producto: Producto): void {
    if (this.carrito.agregar(producto, producto.variantes?.[0])) this.carritoAbierto = true;
  }

}
