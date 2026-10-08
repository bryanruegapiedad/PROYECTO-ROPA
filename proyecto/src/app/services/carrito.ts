import { Injectable } from '@angular/core';
import { Producto, VarianteProducto } from '../models/producto';

export interface ItemCarrito {
  producto: Producto;
  variante: VarianteProducto;
  cantidad: number;
}

function esItemPersistido(valor: unknown): valor is ItemCarrito {
  if (!valor || typeof valor !== 'object') return false;

  const item = valor as Partial<ItemCarrito>;
  if (!item.producto || !item.variante || typeof item.cantidad !== 'number') {
    return false;
  }

  return (
    Number.isInteger(item.cantidad) &&
    item.cantidad > 0 &&
    item.cantidad <= item.variante.stock
  );
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly itemsInternos: ItemCarrito[] = [];
  readonly minimoEnvioGratis = 299;

  constructor() {
    if (typeof localStorage === 'undefined') return;

    try {
      const guardados: unknown = JSON.parse(
        localStorage.getItem('nova_carrito') || '[]',
      );

      if (Array.isArray(guardados)) {
        this.itemsInternos.push(...guardados.filter(esItemPersistido));
      }
    } catch {
      try {
        localStorage.removeItem('nova_carrito');
      } catch {
        // Algunos navegadores pueden bloquear el acceso a localStorage.
      }
    }
  }

  get items(): ItemCarrito[] {
    return this.itemsInternos;
  }

  get cantidadTotal(): number {
    return this.itemsInternos.reduce((total, item) => total + item.cantidad, 0);
  }

  get total(): number {
    return this.itemsInternos.reduce(
      (total, item) => total + item.variante.precio * item.cantidad,
      0,
    );
  }

  get faltaParaEnvioGratis(): number {
    return Math.max(0, this.minimoEnvioGratis - this.total);
  }

  get progresoEnvioGratis(): number {
    return Math.min(100, (this.total / this.minimoEnvioGratis) * 100);
  }

  agregar(producto: Producto, variante?: VarianteProducto, cantidad = 1): boolean {
    const seleccion = variante || producto.variantes?.[0];
    if (
      !seleccion ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      seleccion.stock < cantidad
    ) return false;
    const existente = this.itemsInternos.find(item => item.variante.id === seleccion.id);
    if (existente) {
      if (existente.cantidad + cantidad > seleccion.stock) return false;
      existente.cantidad += cantidad;
    } else {
      this.itemsInternos.push({ producto, variante: seleccion, cantidad });
    }
    this.guardar();
    return true;
  }

  actualizarCantidad(varianteId: number, cantidad: number): boolean {
    const item = this.itemsInternos.find(
      actual => actual.variante.id === varianteId,
    );
    if (
      !item ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > item.variante.stock
    ) return false;
    item.cantidad = cantidad;
    this.guardar();
    return true;
  }

  quitar(varianteId: number): void {
    const indice = this.itemsInternos.findIndex(item => item.variante.id === varianteId);
    if (indice >= 0) {
      this.itemsInternos.splice(indice, 1);
      this.guardar();
    }
  }

  reducir(varianteId: number): void {
    const item = this.itemsInternos.find(item => item.variante.id === varianteId);
    if (!item) return;
    if (item.cantidad === 1) this.quitar(varianteId);
    else {
      item.cantidad -= 1;
      this.guardar();
    }
  }

  limpiar(): void {
    this.itemsInternos.splice(0);
    this.guardar();
  }

  aPedidoItems(): { varianteId: number; cantidad: number }[] {
    return this.itemsInternos.map(item => ({
      varianteId: item.variante.id,
      cantidad: item.cantidad,
    }));
  }

  private guardar(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('nova_carrito', JSON.stringify(this.itemsInternos));
    } catch {
      // El carrito continúa funcionando durante la sesión si el navegador
      // bloquea el almacenamiento local.
    }
  }
}
