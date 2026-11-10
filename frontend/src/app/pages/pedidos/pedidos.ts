import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Producto } from '../../models/producto';
import { Pedido, RotacionProducto } from '../../models/pedido';
import { PedidoService } from '../../services/pedido';
import { ProductoService } from '../../services/producto';
import { AuthService } from '../../services/auth';

interface LineaPedido {
  productoId: number;
  varianteId?: number;
  cantidad: number;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.scss',
})
export class Pedidos implements OnInit {
  private readonly pedidosService = inject(PedidoService);
  private readonly productosService = inject(ProductoService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  pedidos: Pedido[] = [];
  rotacion: RotacionProducto[] = [];
  cliente = '';
  direccionEnvio = 'Atención en Tienda';
  metodoPago = 'Efectivo';
  cantidad = 1;
  lineas: LineaPedido[] = [];
  cargando = true;
  guardando = false;
  mensaje = '';
  error = '';
  fechaActual = new Date();

  // Selector visual de prendas
  busquedaPrenda = '';
  prendaSeleccionada: Producto | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.cdr.detectChanges();

    this.productosService.listar().subscribe({
      next: productos => {
        this.productos = (productos || []).filter(producto => producto.activo !== false);
        this.cdr.detectChanges();
      },
      error: () => this.error = 'No se pudo cargar el catálogo.',
    });

    this.pedidosService.listar().subscribe({
      next: pedidos => {
        this.pedidos = pedidos || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los pedidos.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

    this.pedidosService.rotacion().subscribe({
      next: rotacion => {
        this.rotacion = rotacion || [];
        this.cdr.detectChanges();
      },
      error: () => this.error = 'No se pudo calcular la rotación.',
    });
  }

  get prendasFiltradas(): Producto[] {
    const q = this.busquedaPrenda.trim().toLowerCase();
    if (!q) return this.productos;
    return this.productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.categoria && p.categoria.toLowerCase().includes(q)) ||
      (p.color && p.color.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  }

  seleccionarPrenda(prod: Producto): void {
    if (prod.stock <= 0) return;
    this.prendaSeleccionada = prod;
    this.cantidad = 1;
    this.cdr.detectChanges();
  }

  incrementarCantidad(): void {
    if (!this.prendaSeleccionada) return;
    if (this.cantidad < this.prendaSeleccionada.stock) {
      this.cantidad++;
      this.cdr.detectChanges();
    }
  }

  decrementarCantidad(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
      this.cdr.detectChanges();
    }
  }

  agregarPrendaSeleccionada(): void {
    if (!this.prendaSeleccionada || this.cantidad < 1) return;
    const prodId = this.prendaSeleccionada.id;
    const existente = this.lineas.find(item => item.productoId === prodId);
    if (existente) {
      existente.cantidad += this.cantidad;
    } else {
      this.lineas.push({ productoId: prodId, cantidad: this.cantidad });
    }
    this.prendaSeleccionada = null;
    this.cantidad = 1;
    this.cdr.detectChanges();
  }

  quitarLinea(productoId: number): void {
    this.lineas = this.lineas.filter(item => item.productoId !== productoId);
    this.cdr.detectChanges();
  }

  nombreProducto(productoId: number): string {
    return this.productos.find(item => item.id === productoId)?.nombre || 'Prenda';
  }

  precioProducto(productoId: number): number {
    return this.productos.find(item => item.id === productoId)?.precio || 0;
  }

  fotoDePrenda(productoId: number): string {
    const p = this.productos.find(item => item.id === productoId);
    return this.imagenProducto(p);
  }

  get totalPedido(): number {
    return this.lineas.reduce((total, linea) => total + this.precioProducto(linea.productoId) * linea.cantidad, 0);
  }

  get productoLider(): RotacionProducto | undefined {
    return this.rotacion[0];
  }

  porcentajeRotacion(item: RotacionProducto): number {
    const maximo = this.productoLider?.unidadesVendidas || 1;
    return item.unidadesVendidas ? Math.max(8, item.unidadesVendidas / maximo * 100) : 3;
  }

  imagenProducto(producto: any): string {
    if (producto?.imagen && producto.imagen.trim().length > 5) {
      return producto.imagen.trim();
    }
    const enCat = this.productos.find(p => p.id === (producto?.productoId || producto?.id));
    if (enCat?.imagen && enCat.imagen.trim().length > 5) {
      return enCat.imagen.trim();
    }
    return 'assets/images/products/polos/polo-basico-negro.jpg';
  }

  crearPedido(): void {
    this.error = '';
    this.mensaje = '';
    if (!this.cliente.trim() || !this.lineas.length) {
      this.error = 'Indica el nombre del cliente y añade al menos una prenda a la orden.';
      return;
    }
    this.guardando = true;
    this.cdr.detectChanges();

    const items = this.lineas.map(linea => {
      const prod = this.productos.find(p => p.id === linea.productoId);
      return {
        productoId: linea.productoId,
        varianteId: linea.varianteId || linea.productoId,
        nombre: prod ? prod.nombre : this.nombreProducto(linea.productoId),
        cantidad: linea.cantidad,
        precio: prod ? prod.precio : this.precioProducto(linea.productoId),
      };
    });

    this.pedidosService.crear(
      this.cliente.trim(),
      items,
      this.direccionEnvio.trim() || 'Atención en Tienda',
      this.metodoPago
    ).pipe(
      timeout(10000),
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: pedido => {
        this.pedidos = [pedido, ...this.pedidos];
        this.lineas = [];
        this.cliente = '';
        this.direccionEnvio = 'Atención en Tienda';
        this.prendaSeleccionada = null;
        this.mensaje = `¡Pedido #${pedido.id} registrado con éxito! Entrega estimada: ${this.fecha(pedido.entregaEstimada)}.`;
        this.cargar();
        this.cdr.detectChanges();
      },
      error: response => {
        this.error = response.error?.error || 'No se pudo crear el pedido. Revisa los datos ingresados.';
        this.cdr.detectChanges();
      },
    });
  }

  fecha(valor?: string): string {
    if (!valor) return 'Reciente';
    try {
      return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(valor));
    } catch {
      return valor;
    }
  }

  irDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  irProductos(): void {
    this.router.navigate(['/productos']);
  }

  irTienda(): void {
    this.router.navigate(['/tienda']);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/']);
  }
}
