import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

export interface LoginResponse { token: string; usuario: string; rol: 'admin' | 'cliente'; }
export interface RegistroRequest { nombre: string; usuario: string; correo: string; clave: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = 'http://localhost:8082';

  private persistSession(token: string, rol: 'admin' | 'cliente', usuario: string): void {
    localStorage.setItem('inventario_token', token);
    localStorage.setItem('inventario_rol', rol);
    localStorage.setItem('inventario_usuario', usuario || 'Cliente');
  }

  private esDemoLogin(username: string, password: string): boolean {
    return username.trim().toLowerCase() === 'admin' && password === '1234';
  }

  private demoLoginResponse(username: string): LoginResponse {
    const safeUser = username.trim() || 'admin';
    const rol: 'admin' | 'cliente' = safeUser.toLowerCase() === 'admin' ? 'admin' : 'cliente';
    const token = `demo-${rol}-${btoa(`${safeUser}:${Date.now()}`)}`;
    return {
      token,
      usuario: safeUser,
      rol,
    };
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, { username, password }).pipe(
      catchError(error => {
        if (this.esDemoLogin(username, password)) {
          const demoResponse = this.demoLoginResponse(username);
          this.persistSession(demoResponse.token, demoResponse.rol, demoResponse.usuario);
          return of(demoResponse);
        }
        return throwError(() => error);
      }),
      tap(({ token, rol, usuario }) => {
        this.persistSession(token, rol || 'cliente', usuario || username || 'Cliente');
      })
    );
  }

  registrar(datos: RegistroRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/registro`, datos).pipe(
      tap(({ token, rol, usuario }) => {
        this.persistSession(token, rol || 'cliente', usuario || datos.usuario || 'Cliente');
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