import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { timeout } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CarritoService } from '../../services/carrito';
import { PedidoService } from '../../services/pedido';
import { ProductoService } from '../../services/producto';

export interface Recomendacion {
  talla: string;
  consejo_talla: string;
  consejo_estilo: string;
  combinacion: string;
  motor: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit {
  readonly carrito = inject(CarritoService);
  private readonly auth = inject(AuthService);
  private readonly pedidos = inject(PedidoService);
  private readonly productosService = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  nombre = '';
  apellido = '';
  telefono = '';
  correo = '';
  direccion = '';
  distrito = '';
  referencia = '';
  entrega = 'Envío estándar';
  pago = 'Yape/Plin';
  procesando = false;
  error = '';
  confirmado = '';
  pedidoConfirmado: any = null;

  // ── Recomendador inteligente ──────────────────────────────
  recomendacion: Recomendacion | null = null;
  cargandoRecomendacion = false;
  recomendacionError = '';

  constructor() {
    this.nombre = this.auth.usuarioActual();
  }

  ngOnInit(): void {
    this.cargarRecomendacion();
  }

  /** Llama al endpoint de recomendaciones del backend Node.js
   *  (que espeja las reglas de logic-prolog/recomendador.pl).
   *  Si Python está corriendo en :8083, se puede cambiar la URL allí.
   */
  cargarRecomendacion(): void {
    if (!this.carrito.items.length) return;

    const primerItem = this.carrito.items[0];
    const categoria = primerItem.producto.categoria || 'Prendas superiores';
    const talla     = primerItem.variante?.talla || primerItem.producto.talla || 'M';
    const color     = primerItem.variante?.color || primerItem.producto.color || 'Negro';
    const genero    = primerItem.producto.genero || 'unisex';

    this.cargandoRecomendacion = true;
    this.recomendacionError = '';

    this.productosService.recomendaciones(categoria, talla, color).subscribe({
      next: (resp: any) => {
        this.recomendacion = {
          talla: resp.talla || talla,
          consejo_talla:  resp.consejo_talla  || resp.mensaje || 'Elige la talla que prefieras para mayor comodidad.',
          consejo_estilo: resp.consejo_estilo || 'Elige el estilo que mejor exprese tu personalidad.',
          combinacion:    resp.combinacion    || '',
          motor:          resp.motor          || 'reglas de inferencia',
        };
        this.cargandoRecomendacion = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback local si el backend no responde
        this.recomendacion = {
          talla,
          consejo_talla:  'Elige la talla con la que te sientas más cómodo/a.',
          consejo_estilo: 'El estilo NOVA combina elegancia y comodidad para cada ocasión.',
          combinacion:    'Combina con tonos neutros para un look atemporal.',
          motor:          'local',
        };
        this.cargandoRecomendacion = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmar(): void {
    this.error = '';
    if (!this.carrito.items.length) { 
      this.error = 'Tu carrito está vacío.'; 
      return; 
    }
    if (!this.nombre.trim() || !this.apellido.trim() || !this.telefono.trim() || !this.direccion.trim() || !this.distrito.trim()) {
      this.error = 'Completa todos los datos de entrega obligatorios (Nombre, Apellido, Teléfono, Dirección y Distrito).';
      return;
    }

    this.procesando = true;
    this.cdr.detectChanges();

    const cliente = `${this.nombre.trim()} ${this.apellido.trim()}`;
    const direccion = `${this.direccion.trim()}, ${this.distrito.trim()}${this.referencia.trim() ? `. Ref: ${this.referencia.trim()}` : ''}`;
    
    this.pedidos.crear(cliente, this.carrito.aPedidoItems(), direccion, this.pago)
      .pipe(timeout(12000))
      .subscribe({
        next: (pedido: any) => {
          this.pedidoConfirmado = pedido;
          this.confirmado = `Pedido #${pedido.id} confirmado correctamente.`;
          this.carrito.limpiar();
          this.procesando = false;
          this.cdr.detectChanges();
        },
        error: (response: any) => {
          console.error('Error al registrar pedido:', response);
          this.error = response.error?.error || (response.name === 'TimeoutError'
            ? 'El servidor tardó en responder. Por favor verifica si el pedido se generó o inténtalo nuevamente.'
            : 'No se pudo registrar el pedido. Comprueba que el servidor esté activo.');
          this.procesando = false;
          this.cdr.detectChanges();
        },
      });
  }
}

