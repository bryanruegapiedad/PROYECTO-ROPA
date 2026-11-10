import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Producto } from '../../models/producto';
import { AuthService } from '../../services/auth';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';
import { CarritoDrawer } from '../../components/carrito-drawer/carrito-drawer';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, RouterModule, CarritoDrawer],
  templateUrl: './novedades.html',
  styleUrl: './novedades.scss',
})
export class Novedades implements OnInit {
  private readonly productosService = inject(ProductoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  filtroActivo: 'todos' | 'recientes' | 'tendencias' | 'edicion-limitada' = 'todos';
  cargando = true;
  carritoAbierto = false;

  get esAdmin(): boolean {
    return this.auth.esAdmin();
  }

  ngOnInit(): void {
    this.cargarNovedades();
  }

  cargarNovedades(): void {
    this.cargando = true;
    this.cdr.detectChanges();

    this.productosService.listar().subscribe({
      next: (lista: Producto[]) => {
        // Ordenamos las prendas para destacar los lanzamientos más recientes
        this.productos = [...lista].reverse();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get productosFiltrados(): Producto[] {
    if (this.filtroActivo === 'recientes') {
      return this.productos.slice(0, 8);
    }
    if (this.filtroActivo === 'tendencias') {
      return this.productos.filter(p => p.precio >= 120);
    }
    if (this.filtroActivo === 'edicion-limitada') {
      return this.productos.filter(p => p.stock > 0 && p.stock <= 12);
    }
    return this.productos;
  }

  cambiarFiltro(filtro: 'todos' | 'recientes' | 'tendencias' | 'edicion-limitada'): void {
    this.filtroActivo = filtro;
  }

  imagen(producto: Producto): string {
    const fallback = 'assets/images/products/polos/polo-basico-negro.jpg';
    if (producto.imagen?.trim()) return producto.imagen.trim();
    if (producto.imagenPrincipal?.trim()) return producto.imagenPrincipal.trim();
    return fallback;
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('polo-basico-negro')) {
      target.src = 'assets/images/products/polos/polo-basico-negro.jpg';
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  alternarCarrito(): void {
    this.carritoAbierto = !this.carritoAbierto;
  }

  cerrarCarrito(): void {
    this.carritoAbierto = false;
  }

  agregarAlCarrito(producto: Producto): void {
    if (this.carrito.agregar(producto, producto.variantes?.[0])) {
      this.carritoAbierto = true;
    }
  }
}
