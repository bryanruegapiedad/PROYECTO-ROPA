import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService, ItemCarrito } from '../../services/carrito';

@Component({
  selector: 'app-carrito-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito-drawer.html',
  styleUrl: './carrito-drawer.scss',
})
export class CarritoDrawer {
  @Input() abierto = false;
  @Output() cerrado = new EventEmitter<void>();

  readonly carrito = inject(CarritoService);

  cerrar(): void {
    this.cerrado.emit();
  }

  incrementar(item: ItemCarrito): void {
    this.carrito.actualizarCantidad(item.variante.id, item.cantidad + 1);
  }

  decrementar(item: ItemCarrito): void {
    if (item.cantidad === 1) {
      this.carrito.quitar(item.variante.id);
      return;
    }
    this.carrito.actualizarCantidad(item.variante.id, item.cantidad - 1);
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto) this.cerrar();
  }
}
