import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
export class Categoria implements OnInit {
  private readonly productosService = inject(ProductoService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly carrito = inject(CarritoService);

  productos: Producto[] = [];
  categoria = '';
  cargando = true;
  carritoAbierto = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const catParam = params.get('categoria') || 'mujeres';
      this.cargarCategoria(catParam);
    });
  }

  cargarCategoria(valor: string): void {
    this.categoria = valor;
    this.cargando = true;
    this.cdr.detectChanges();

    this.productosService.listar().subscribe({
      next: (lista: Producto[]) => {
        this.productos = this.filtrarGenero(lista, valor);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get titulo(): string { 
    return this.categoria.charAt(0).toUpperCase() + this.categoria.slice(1); 
  }

  get categorias(): string[] { 
    return ['mujeres', 'varones', 'niños', 'niñas']; 
  }

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

  cambiarCategoria(valor: string): void { 
    this.router.navigate(['/tienda/categoria', valor]); 
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private filtrarGenero(productos: Producto[], valor: string): Producto[] {
    const valNorm = this.normalizarTexto(valor);

    const equivalencias: Record<string, string[]> = { 
      mujeres: ['mujer', 'mujeres', 'unisex', 'dama', 'damas'], 
      varones: ['hombre', 'varones', 'varon', 'unisex', 'caballero', 'caballeros'], 
      ninas: ['nina', 'ninas', 'infantil', 'unisex'], 
      ninos: ['nino', 'ninos', 'infantil', 'unisex'] 
    };

    const permitidos = equivalencias[valNorm] || [valNorm, 'unisex'];

    return productos.filter(p => {
      const generoNorm = this.normalizarTexto(p.genero || '');
      const catNorm = this.normalizarTexto(p.categoria || '');

      return permitidos.includes(generoNorm) || 
             permitidos.includes(catNorm) ||
             catNorm.includes(valNorm) ||
             generoNorm.includes(valNorm);
    });
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
