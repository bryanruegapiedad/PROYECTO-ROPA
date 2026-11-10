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
  prendasHero: Producto[] = [];
  categoria = '';
  cargando = true;
  carritoAbierto = false;

  get esAdmin(): boolean {
    return this.auth.esAdmin();
  }

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
        const filtrados = this.filtrarGenero(lista, valor);
        this.productos = filtrados;
        if (filtrados.length) {
          this.prendasHero = filtrados.slice(0, 2);
        }
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
    if (!producto) return 'assets/images/products/polos/polo-basico-negro.jpg';

    // 1. Si el producto ya tiene asignada una imagen válida en la base de datos, usarla
    if (producto.imagen && producto.imagen.trim().length > 5) {
      return producto.imagen.trim();
    }

    const nombre = (producto.nombre || '').toLowerCase();
    const color = (producto.color || '').toLowerCase();

    // 2. Mapeos locales fieles por tipo de prenda
    if (nombre.includes('vestido')) {
      if (color.includes('azul')) return 'assets/images/products/vestidos/vestido-casual-azul.png';
      if (color.includes('negro')) return 'assets/images/products/vestidos/vestido-casual-negro.png';
      if (color.includes('rojo') || color.includes('coral')) return 'assets/images/products/vestidos/vestido-casual-rojo.jpg';
      return 'assets/images/products/vestidos/vestido-casual-beige.png';
    }

    if (nombre.includes('jean') || nombre.includes('pantal') || nombre.includes('jogger') || nombre.includes('cargo')) {
      if (color.includes('negro')) return 'assets/images/products/pantalones/jean-clasico-negro.png';
      if (color.includes('beige') || color.includes('arena') || color.includes('caqui')) return 'assets/images/products/pantalones/jean-clasico-beige.png';
      if (color.includes('gris')) return 'assets/images/products/pantalones/jean-clasico-gris.png';
      return 'assets/images/products/pantalones/jean-clasico-azul.jpg';
    }

    if (nombre.includes('polera') || nombre.includes('sudadera') || nombre.includes('hoodie')) {
      if (color.includes('gris') || color.includes('melange') || color.includes('crema')) return 'assets/images/products/poleras/polera-basica-gris.png';
      return 'assets/images/products/poleras/polera-basica-negra.png';
    }

    if (nombre.includes('polo') || nombre.includes('camiseta')) {
      if (color.includes('blanco') || color.includes('hueso')) return 'assets/images/products/polos/polo-basico-blanco.png';
      if (color.includes('azul') || color.includes('cielo')) return 'assets/images/products/polos/polo-basico-azul.jpg';
      if (color.includes('rojo') || color.includes('fuego')) return 'assets/images/products/polos/polo-basico-rojo.jpg';
      return 'assets/images/products/polos/polo-basico-negro.jpg';
    }

    if (nombre.includes('blusa') || nombre.includes('top')) {
      if (color.includes('blanco') || color.includes('marfil')) return 'assets/images/products/blusas/blusa-blanca.png';
      if (color.includes('rosa') || color.includes('pastel')) return 'assets/images/products/blusas/blusa-basica-rosa.png';
      return 'assets/images/products/blusas/blusa-basica-azul.jpg';
    }

    if (nombre.includes('zapat') || nombre.includes('calzado') || nombre.includes('botin')) {
      if (color.includes('negro') || color.includes('marr')) return 'assets/images/products/zapatos/zapatilla-casual-negra.png';
      if (color.includes('rosa')) return 'assets/images/products/zapatos/zapatilla-casual-rosa.png';
      if (color.includes('azul')) return 'assets/images/products/zapatos/zapatilla-casual-azul.png';
      return 'assets/images/products/zapatos/zapatilla-casual-blanca.png';
    }

    if (producto.imagen?.trim()) return producto.imagen;
    return 'assets/images/products/polos/polo-basico-negro.jpg';
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('polo-basico-negro')) {
      target.src = 'assets/images/products/polos/polo-basico-negro.jpg';
    }
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
