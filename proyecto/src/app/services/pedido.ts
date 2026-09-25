import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Pedido, RotacionProducto } from '../models/pedido';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:8082';

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/pedidos`);
  }

  rotacion(): Observable<RotacionProducto[]> {
    return this.http.get<RotacionProducto[]>(`${this.api}/pedidos/rotacion`);
  }

  crear(
    cliente: string,
    items: { varianteId: number; cantidad: number }[],
    direccionEnvio: string = '',
    metodoPago: string = 'Efectivo'
  ): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.api}/pedidos`, {
      cliente,
      items,
      direccionEnvio,
      metodoPago,
    });
  }
}