import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface LoginResponse { token: string; usuario: string; rol: 'admin' | 'cliente'; }
export interface RegistroRequest { nombre: string; usuario: string; correo: string; clave: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = 'http://localhost:8082';

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, { username, password }).pipe(
      tap(({ token, rol, usuario }) => {
        localStorage.setItem('inventario_token', token);
        localStorage.setItem('inventario_rol', rol || 'cliente');
        localStorage.setItem('inventario_usuario', usuario || username || 'Cliente');
      })
    );
  }

  registrar(datos: RegistroRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/registro`, datos).pipe(
      tap(({ token, rol, usuario }) => {
        localStorage.setItem('inventario_token', token);
        localStorage.setItem('inventario_rol', rol || 'cliente');
        localStorage.setItem('inventario_usuario', usuario || datos.usuario || 'Cliente');
      })
    );
  }

  recuperarClave(correo: string) {
    return this.http.post(`${this.api}/recuperar-clave`, { correo });
  }

  autenticado(): boolean {
    return !!localStorage.getItem('inventario_token');
  }

  token(): string | null {
    return localStorage.getItem('inventario_token');
  }

  rol(): string | null {
    return localStorage.getItem('inventario_rol');
  }

  usuarioActual(): string {
    return localStorage.getItem('inventario_usuario') || 'Cliente';
  }

  cerrarSesion(): void {
    localStorage.removeItem('inventario_token');
    localStorage.removeItem('inventario_rol');
    localStorage.removeItem('inventario_usuario');
  }
}