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
    if (nombre.includes('jean') || nombre.includes('pantal')) return 'assets/images/products/pantalones/jean-clasico-azul.jpg';
    if (nombre.includes('polera')) return 'assets/images/products/poleras/polera-basica-negra.png';
    if (nombre.includes('blusa')) return 'assets/images/products/blusas/blusa-basica-azul.jpg';
    if (nombre.includes('vestido')) return 'assets/images/products/vestidos/vestido-casual-rojo.jpg';
    if (nombre.includes('casaca') || nombre.includes('blazer')) return 'assets/images/products/polos/polo-basico-negro.jpg';
    return 'assets/images/products/polos/polo-basico-negro.jpg';
  }

  irProductos() {
    this.router.navigate(['/productos']);
  }

  irPedidos() {
    this.router.navigate(['/pedidos']);
  }
}