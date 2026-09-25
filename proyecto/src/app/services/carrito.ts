import { Injectable } from '@angular/core';
import { Producto, VarianteProducto } from '../models/producto';

export interface ItemCarrito {
  producto: Producto;
  variante: VarianteProducto;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly itemsInternos: ItemCarrito[] = [];

  get items(): ItemCarrito[] {
    return this.itemsInternos;
  }

  get cantidadTotal(): number {
    return this.itemsInternos.reduce((total, item) => total + item.cantidad, 0);
  }

  get total(): number {
    return this.itemsInternos.reduce((total, item) => total + item.producto.precio * item.cantidad, 0);
  }

  agregar(producto: Producto, variante?: VarianteProducto, cantidad = 1): boolean {
    const seleccion = variante || producto.variantes?.[0];
    if (!seleccion || seleccion.stock < cantidad) return false;
    const existente = this.itemsInternos.find(item => item.variante.id === seleccion.id);
    if (existente) {
      if (existente.cantidad + cantidad > seleccion.stock) return false;
      existente.cantidad += cantidad;
    } else {
      this.itemsInternos.push({ producto, variante: seleccion, cantidad });
    }
    return true;
  }

  quitar(varianteId: number): void {
    const indice = this.itemsInternos.findIndex(item => item.variante.id === varianteId);
    if (indice >= 0) this.itemsInternos.splice(indice, 1);
  }

  reducir(varianteId: number): void {
    const item = this.itemsInternos.find(item => item.variante.id === varianteId);
    if (!item) return;
    if (item.cantidad === 1) this.quitar(varianteId);
    else item.cantidad -= 1;
  }

  limpiar(): void {
    this.itemsInternos.splice(0);
  }

  aPedidoItems(): { varianteId: number; cantidad: number }[] {
    return this.itemsInternos.map(item => ({
      varianteId: item.variante.id,
      cantidad: item.cantidad,
    }));
  }
}
