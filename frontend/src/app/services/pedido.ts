import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MetricasDashboard, Pedido, RotacionProducto } from '../models/pedido';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:8082';

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/pedidos`);
  }

  metricas(): Observable<MetricasDashboard> {
    return this.http.get<MetricasDashboard>(`${this.api}/pedidos/metricas`);
  }

  actualizarEstado(idPedido: number, estado: string): Observable<{ ok: boolean; pedido: Pedido }> {
    return this.http.patch<{ ok: boolean; pedido: Pedido }>(`${this.api}/pedidos/${idPedido}/estado`, { estado });
  }

  rotacion(): Observable<RotacionProducto[]> {
    return this.http.get<RotacionProducto[]>(`${this.api}/pedidos/rotacion`);
  }

  crear(
    cliente: string,
    items: { productoId?: number; varianteId?: number; cantidad: number; nombre?: string }[],
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