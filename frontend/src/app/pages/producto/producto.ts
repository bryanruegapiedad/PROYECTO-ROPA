import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { timeout } from 'rxjs';
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
  private readonly cdr = inject(ChangeDetectorRef);
  readonly carrito = inject(CarritoService);
  private readonly colorHexByName = new Map<string, string>([
    ['Negro', '#111111'],
    ['Blanco', '#F7F7F7'],
    ['Azul', '#173E7A'],
    ['Rojo', '#C11020'],
    ['Rosa', '#E9B2B8'],
    ['Beige', '#C7B59E'],
    ['Gris', '#A5A9AD'],
  ]);

  producto: Producto | null = null;
  variante: VarianteProducto | null = null;
  cantidad = 1;
  imagenActiva = '';
  cargando = true;
  mensaje = '';
  error = '';
  recomendacion = '';

  constructor() {
    this.cargarProducto();
  }

  cargarProducto(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.producto = null;
    this.error = '';
    this.cargando = true;
    if (!Number.isInteger(id) || id <= 0) {
      this.error = 'El enlace de esta prenda no es válido.';
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.productos.detalle(id).pipe(timeout(10000)).subscribe({
      next: producto => {
        this.producto = producto;
        this.variante = producto.variantes?.[0] || null;
        this.sincronizarVariante();
        this.recomendacion = '';
        this.cargando = false;
        this.cdr.detectChanges();
        this.productos.recomendaciones(
          producto.categoria || 'mujer',
          this.variante?.talla || producto.talla || 'M',
          this.variante?.color || producto.color || 'Negro'
        ).subscribe({
          next: respuesta => {
            this.recomendacion = respuesta.mensaje || '';
            this.cdr.detectChanges();
          },
          error: () => {
            this.recomendacion = 'Estilo versátil para tu próxima compra.';
            this.cdr.detectChanges();
          }
        });
      },
      error: response => {
        this.error = response.error?.error || (response.name === 'TimeoutError'
          ? 'La tienda está tardando en responder. Comprueba tu conexión e inténtalo otra vez.'
          : 'No se pudo cargar esta prenda. Comprueba que el servidor esté iniciado.');
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get imagenes(): string[] {
    const variantesImagen = this.producto?.variantes?.map(item => item.imagen).filter((url): url is string => !!url) || [];
    const base = this.producto?.imagenes?.map(imagen => imagen.url) || [];
    const urls = [
      this.producto?.imagenPrincipal || this.producto?.imagen || '',
      ...base,
      ...variantesImagen,
    ].filter(Boolean);
    return [...new Set(urls)];
  }

  get colores(): string[] {
    return [...new Set(this.producto?.colores || this.producto?.variantes?.map(item => item.color) || [])];
  }

  get tallas(): string[] {
    return [...new Set(this.producto?.tallas || this.producto?.variantes?.map(item => item.talla) || [])];
  }

  getColorHex(color: string): string {
    return this.colorHexByName.get(color) ?? '#d9d9d9';
  }

  private sincronizarVariante(): void {
    if (!this.producto || !this.producto.variantes?.length) {
      this.variante = null;
      this.imagenActiva = this.producto?.imagenPrincipal ?? this.producto?.imagen ?? '';
      return;
    }

    const colorBase = this.variante?.color || this.colores[0] || this.producto.color || this.producto.variantes[0].color;
    const tallaBase = this.variante?.talla || this.tallas[0] || this.producto.talla || this.producto.variantes[0].talla;

    const varianteElegida =
      this.producto.variantes.find(item => item.color === colorBase && item.talla === tallaBase && item.stock > 0) ||
      this.producto.variantes.find(item => item.color === colorBase && item.talla === tallaBase) ||
      this.producto.variantes.find(item => item.color === colorBase && item.stock > 0) ||
      this.producto.variantes.find(item => item.talla === tallaBase && item.stock > 0) ||
      this.producto.variantes[0];

    this.variante = varianteElegida || null;
    this.imagenActiva = this.variante?.imagen ?? this.producto.imagenPrincipal ?? this.producto.imagen ?? '';
    this.cantidad = Math.min(Math.max(this.cantidad, 1), this.variante?.stock || 1);
  }

  seleccionarColor(color: string): void {
    if (!this.producto || !this.producto.variantes?.length) return;

    const tallaActual = this.variante?.talla || this.tallas[0] || this.producto.variantes[0].talla;
    const siguiente =
      this.producto.variantes.find(item => item.color === color && item.talla === tallaActual && item.stock > 0) ||
      this.producto.variantes.find(item => item.color === color && item.talla === tallaActual) ||
      this.producto.variantes.find(item => item.color === color && item.stock > 0) ||
      this.producto.variantes.find(item => item.color === color);

    if (siguiente) {
      this.variante = siguiente;
      this.imagenActiva = siguiente.imagen ?? this.producto.imagenPrincipal ?? this.producto.imagen ?? '';
      this.cantidad = Math.min(Math.max(this.cantidad, 1), siguiente.stock || 1);
    }
  }

  seleccionarTalla(talla: string): void {
    if (!this.producto || !this.producto.variantes?.length) return;

    const colorActual = this.variante?.color || this.colores[0] || this.producto.color || this.producto.variantes[0].color;
    const siguiente =
      this.producto.variantes.find(item => item.talla === talla && item.color === colorActual && item.stock > 0) ||
      this.producto.variantes.find(item => item.talla === talla && item.color === colorActual) ||
      this.producto.variantes.find(item => item.talla === talla && item.stock > 0) ||
      this.producto.variantes.find(item => item.talla === talla);

    if (siguiente) {
      this.variante = siguiente;
      this.imagenActiva = siguiente.imagen ?? this.producto.imagenPrincipal ?? this.producto.imagen ?? '';
      this.cantidad = Math.min(Math.max(this.cantidad, 1), siguiente.stock || 1);
    }
  }

  disponible(talla: string): boolean {
    if (!this.producto || !this.variante) return false;
    return this.producto.variantes?.some(item => item.talla === talla && item.color === this.variante?.color && item.stock > 0) ?? false;
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
    this.mensaje = `${this.producto.nombre} · ${this.variante.color} / ${this.variante.talla} · cantidad ${this.cantidad} agregado al carrito.`;
    if (comprarAhora) this.router.navigate(['/checkout']);
  }
}
