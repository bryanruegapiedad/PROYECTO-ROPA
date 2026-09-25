import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CarritoService } from '../../services/carrito';
import { PedidoService } from '../../services/pedido';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  readonly carrito = inject(CarritoService);
  private readonly auth = inject(AuthService);
  private readonly pedidos = inject(PedidoService);
  private readonly router = inject(Router);

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

  constructor() {
    this.nombre = this.auth.usuarioActual();
  }

  confirmar(): void {
    this.error = '';
    if (!this.carrito.items.length) { this.error = 'Tu carrito está vacío.'; return; }
    if (!this.nombre.trim() || !this.apellido.trim() || !this.telefono.trim() || !this.direccion.trim() || !this.distrito.trim()) {
      this.error = 'Completa los datos de entrega obligatorios.';
      return;
    }
    this.procesando = true;
    const cliente = `${this.nombre.trim()} ${this.apellido.trim()}`;
    const direccion = `${this.direccion.trim()}, ${this.distrito.trim()}${this.referencia.trim() ? `. Ref: ${this.referencia.trim()}` : ''}`;
    this.pedidos.crear(cliente, this.carrito.aPedidoItems(), direccion, this.pago).subscribe({
      next: pedido => {
        this.confirmado = `Pedido #${pedido.id} confirmado correctamente.`;
        this.carrito.limpiar();
        this.procesando = false;
      },
      error: response => { this.error = response.error?.error || 'No se pudo registrar el pedido.'; this.procesando = false; },
    });
  }
}
