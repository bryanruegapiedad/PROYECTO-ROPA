import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductoService } from '../../services/producto';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly productosService = inject(ProductoService);
  productos: Producto[] = [];
  cargando = true;

  constructor(private router: Router) {
    this.productosService.listar().subscribe({
      next: productos => {
        this.productos = productos;
        this.cargando = false;
      },
      error: () => this.cargando = false,
    });
  }

  get totalStock(): number {
    return this.productos.reduce((total, producto) => total + producto.stock, 0);
  }

  get stockBajo(): number {
    return this.productos.filter(producto => producto.stock < 10).length;
  }

  get valorInventario(): number {
    return this.productos.reduce((total, producto) => total + producto.precio * producto.stock, 0);
  }

  imagenProducto(producto: Producto): string {
    if (producto.imagen?.trim()) return producto.imagen;
    const nombre = producto.nombre.toLowerCase();
    if (nombre.includes('jean') || nombre.includes('pantal')) return 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=500&q=80';
    if (nombre.includes('vestido')) return 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=500&q=80';
    if (nombre.includes('casaca') || nombre.includes('blazer')) return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=80';
    return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80';
  }

  irProductos() {
    this.router.navigate(['/productos']);
  }

  irPedidos() {
    this.router.navigate(['/pedidos']);
  }
}