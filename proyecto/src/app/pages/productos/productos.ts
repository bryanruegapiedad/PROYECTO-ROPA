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
    if (nombre.includes('jean') || nombre.includes('pantal')) return 'assets/images/products/pantalones/jean-clasico-azul.jpg';
    if (nombre.includes('polera')) return 'assets/images/products/poleras/polera-basica-negra.png';
    if (nombre.includes('blusa')) return 'assets/images/products/blusas/blusa-basica-azul.jpg';
    if (nombre.includes('vestido')) return 'assets/images/products/vestidos/vestido-casual-rojo.jpg';
    if (nombre.includes('casaca') || nombre.includes('chaqueta') || nombre.includes('blazer')) return 'assets/images/products/polos/polo-basico-negro.jpg';
    if (nombre.includes('polo')) return 'assets/images/products/polos/polo-basico-negro.jpg';
    return 'assets/images/products/blusas/blusa-basica-blanca.jpg';
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
    return { id: 0, sku: '', nombre: '', precio: 0, stock: 0, categoria: 'Novedades', talla: 'M', color: '', imagen: 'assets/images/products/blusas/blusa-basica-blanca.jpg', activo: true };
  }
}