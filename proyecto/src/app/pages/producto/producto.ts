import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Producto, VarianteProducto } from '../../models/producto';
import { ProductoService } from '../../services/producto';
import { CarritoService } from '../../services/carrito';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './producto.html',
  styleUrl: './producto.scss',
})
export class ProductoDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productos = inject(ProductoService);
  readonly carrito = inject(CarritoService);

  producto: Producto | null = null;
  variante: VarianteProducto | null = null;
  cantidad = 1;
  imagenActiva = '';
  cargando = true;
  mensaje = '';
  error = '';

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productos.detalle(id).subscribe({
      next: producto => {
        this.producto = producto;
        this.variante = producto.variantes?.[0] || null;
        this.imagenActiva = producto.imagenes?.[0]?.url || producto.imagen;
        this.cargando = false;
      },
      error: response => {
        this.error = response.error?.error || 'No se pudo cargar el producto.';
        this.cargando = false;
      },
    });
  }

  get imagenes(): string[] {
    const guardadas = this.producto?.imagenes?.map(imagen => imagen.url) || [];
    return guardadas.length ? guardadas : (this.producto?.imagen ? [this.producto.imagen] : []);
  }

  get colores(): string[] {
    return [...new Set(this.producto?.variantes?.map(item => item.color) || [])];
  }

  get tallas(): string[] {
    return [...new Set(this.producto?.variantes?.map(item => item.talla) || [])];
  }

  seleccionarColor(color: string): void {
    const siguiente = this.producto?.variantes?.find(item => item.color === color && item.stock > 0)
      || this.producto?.variantes?.find(item => item.color === color);
    if (siguiente) this.variante = siguiente;
  }

  seleccionarTalla(talla: string): void {
    const siguiente = this.producto?.variantes?.find(item => item.talla === talla && item.color === this.variante?.color)
      || this.producto?.variantes?.find(item => item.talla === talla);
    if (siguiente) this.variante = siguiente;
  }

  disponible(talla: string): boolean {
    return !!this.producto?.variantes?.some(item => item.talla === talla && item.color === this.variante?.color && item.stock > 0);
  }

  cambiarCantidad(delta: number): void {
    const maximo = this.variante?.stock || 1;
    this.cantidad = Math.min(maximo, Math.max(1, this.cantidad + delta));
  }

  agregar(comprarAhora = false): void {
    this.error = '';
    if (!this.producto || !this.variante) {
      this.error = 'Selecciona una variante disponible.';
      return;
    }
    if (!this.carrito.agregar(this.producto, this.variante, this.cantidad)) {
      this.error = 'No hay suficiente stock para esta variante.';
      return;
    }
    this.mensaje = `${this.producto.nombre} fue agregado al carrito.`;
    if (comprarAhora) this.router.navigate(['/checkout']);
  }
}
