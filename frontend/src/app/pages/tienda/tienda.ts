import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Producto, VarianteProducto } from '../../models/producto';
import { AuthService } from '../../services/auth';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';
import { CarritoDrawer } from '../../components/carrito-drawer/carrito-drawer';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule, RouterModule, CarritoDrawer],
  templateUrl: './tienda.html',
  styleUrl: './tienda.scss',
})
export class Tienda {
  private readonly productosService = inject(ProductoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  categoria = 'Todas';
  cargando = true;
  carritoAbierto = false;
  productoSeleccionado: Producto | null = null;
  varianteSeleccionada: VarianteProducto | null = null;

  constructor() {
    this.productosService.listar().subscribe({
      next: productos => {
        this.productos = Array.isArray(productos) ? productos : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.productos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get categorias(): string[] {
    return ['niños', 'niñas', 'mujeres', 'varones'];
  }

  get destacados(): Producto[] {
    return this.productos.slice(0, 3);
  }

  imagen(producto: Producto): string {
    const fallback = 'assets/images/products/polos/polo-basico-negro.jpg';
    return producto.imagenPrincipal || producto.imagen || fallback;
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  irCategoria(categoria: string): void {
    this.router.navigate(['/tienda/categoria', categoria]);
  }

  alternarCarrito(): void { this.carritoAbierto = !this.carritoAbierto; }
  cerrarCarrito(): void { this.carritoAbierto = false; }
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

}
