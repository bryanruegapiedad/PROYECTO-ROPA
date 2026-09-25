import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto';
export type { Producto } from '../models/producto';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private http = inject(HttpClient);
  private api = 'http://localhost:8082';

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos`);
  }

  detalle(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.api}/productos/${id}`);
  }

  agregar(producto: Producto): Observable<object> {
    return this.http.post(`${this.api}/productos`, producto);
  }

  editar(producto: Producto): Observable<object> {
    return this.http.post(`${this.api}/productos/editar`, producto);
  }

  eliminar(id: number): Observable<object> {
    return this.http.delete(`${this.api}/productos/${id}`);
  }
}