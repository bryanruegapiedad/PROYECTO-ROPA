import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Producto } from '../../models/producto';
import { ProductoService } from '../../services/producto';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './productos.html',
  styleUrl: './productos.scss',
})
export class Productos implements OnInit {
  private readonly servicio = inject(ProductoService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  editando = false;
  categoriaFiltro = 'Todas';
  terminoBusqueda = '';
  cargando = true;
  fechaActual = new Date();
  producto: Producto = this.nuevoProducto();

  ngOnInit(): void {
    this.cargar();
  }

  get categorias(): string[] {
    return ['Todas', ...new Set(this.productos.map(producto => producto.categoria).filter(Boolean))];
  }

  get productosFiltrados(): Producto[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    return this.productos.filter(producto => {
      const coincideCategoria = this.categoriaFiltro === 'Todas' || producto.categoria === this.categoriaFiltro;
      const coincideBusqueda = !termino
        || producto.nombre.toLowerCase().includes(termino)
        || (producto.sku && producto.sku.toLowerCase().includes(termino))
        || (producto.color && producto.color.toLowerCase().includes(termino));
      return coincideCategoria && coincideBusqueda;
    });
  }

  imagenProducto(producto: Producto): string {
    if (producto.imagen && producto.imagen.trim().length > 5) {
      return producto.imagen.trim();
    }
    return 'assets/images/products/polos/polo-basico-negro.jpg';
  }

  cargar(): void {
    this.cargando = true;
    this.cdr.detectChanges();
    this.servicio.listar().subscribe({
      next: res => {
        this.productos = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardar(): void {
    const operacion = this.editando ? this.servicio.editar(this.producto) : this.servicio.agregar(this.producto);
    operacion.subscribe({
      next: () => {
        this.cancelar();
        this.cargar();
      },
      error: (err) => {
        console.error('Error al guardar producto:', err);
      }
    });
  }

  editar(producto: Producto): void {
    this.editando = true;
    this.producto = { ...producto };
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  cancelar(): void {
    this.editando = false;
    this.producto = this.nuevoProducto();
    this.cdr.detectChanges();
  }

  eliminar(id: number): void {
    if (!confirm('¿Desea retirar esta prenda del catálogo?')) return;
    this.servicio.eliminar(id).subscribe({
      next: () => this.cargar()
    });
  }

  irDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  irPedidos(): void {
    this.router.navigate(['/pedidos']);
  }

  irTienda(): void {
    this.router.navigate(['/tienda']);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }

  private nuevoProducto(): Producto {
    return {
      id: 0,
      sku: '',
      nombre: '',
      precio: 0,
      stock: 0,
      categoria: 'Novedades',
      talla: 'M',
      color: '',
      imagen: '',
      activo: true,
    };
  }
}
