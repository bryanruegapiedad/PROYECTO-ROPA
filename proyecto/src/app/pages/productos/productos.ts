import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../models/producto';
import { ProductoService } from '../../services/producto';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrl: './productos.scss',
})
export class Productos {
  private readonly servicio = inject(ProductoService);
  productos: Producto[] = [];
  editando = false;
  categoriaFiltro = 'Todas';
  terminoBusqueda = '';
  producto: Producto = this.nuevoProducto();

  ngOnInit(): void { this.cargar(); }

  get categorias(): string[] {
    return ['Todas', ...new Set(this.productos.map(producto => producto.categoria))];
  }

  get productosFiltrados(): Producto[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    return this.productos.filter(producto => {
      const coincideCategoria = this.categoriaFiltro === 'Todas' || producto.categoria === this.categoriaFiltro;
      const coincideBusqueda = !termino
        || producto.nombre.toLowerCase().includes(termino)
        || producto.sku.toLowerCase().includes(termino)
        || producto.color.toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }

  imagenProducto(producto: Producto): string {
    if (producto.imagen?.trim()) return producto.imagen;
    const nombre = producto.nombre.toLowerCase();
    if (nombre.includes('jean') || nombre.includes('pantal')) return 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=85';
    if (nombre.includes('vestido')) return 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85';
    if (nombre.includes('casaca') || nombre.includes('chaqueta') || nombre.includes('blazer')) return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85';
    if (nombre.includes('polo') || nombre.includes('polera')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85';
    return 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=85';
  }

  cargar(): void {
    this.servicio.listar().subscribe({ next: res => this.productos = res });
  }

  guardar(): void {
    const operacion = this.editando ? this.servicio.editar(this.producto) : this.servicio.agregar(this.producto);
    operacion.subscribe({ next: () => { this.cancelar(); this.cargar(); } });
  }

  editar(producto: Producto): void {
    this.editando = true;
    this.producto = { ...producto };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelar(): void { this.editando = false; this.producto = this.nuevoProducto(); }

  eliminar(id: number): void {
    if (!confirm('¿Desea retirar este producto del catálogo?')) return;
    this.servicio.eliminar(id).subscribe({ next: () => this.cargar() });
  }

  private nuevoProducto(): Producto {
    return { id: 0, sku: '', nombre: '', precio: 0, stock: 0, categoria: 'Novedades', talla: 'M', color: '', imagen: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=300&q=80', activo: true };
  }
}