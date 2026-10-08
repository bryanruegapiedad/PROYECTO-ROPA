import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  usuario = '';
  clave = '';
  confirmarClave = '';
  nombre = '';
  correo = '';
  modoRegistro = false;
  mostrarClave = false;
  mostrarConfirmacion = false;
  mostrarRecuperacion = false;
  recuperacionEnviada = false;
  correoRecuperacion = '';
  error = '';
  cargando = false;
  readonly patronCorreo = '^[^@\\s]+@([Gg][Mm][Aa][Ii][Ll]|[Hh][Oo][Tt][Mm][Aa][Ii][Ll])\\.com$';
  readonly patronUsuario = '^[a-zA-Z0-9._-]{3,30}$';

  constructor(private router: Router, private auth: AuthService) {}

  ingresar() {
    this.error = '';
    if (!this.usuario.trim() || !this.clave) {
      this.error = 'Escribe tu usuario y contraseña.';
      return;
    }
    this.cargando = true;
    this.auth.login(this.usuario.trim(), this.clave).pipe(
      timeout({ each: 5000 }),
      finalize(() => this.cargando = false),
    ).subscribe({
      next: () => this.router.navigate(['/tienda']),
      error: (response) => {
        this.error = this.mensajeError(response, 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.');
      },
    });
  }

  registrar() {
    this.error = '';
    if (this.nombre.trim().length < 2) {
      this.error = 'Escribe tu nombre completo.';
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(this.usuario.trim())) {
      this.error = 'El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo).';
      return;
    }
    if (!this.correoValido(this.correo)) {
      this.error = 'Usa un correo @gmail.com o @hotmail.com.';
      return;
    }
    if (this.clave.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.clave !== this.confirmarClave) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.cargando = true;
    this.auth.registrar({ nombre: this.nombre.trim(), usuario: this.usuario.trim(), correo: this.correo.trim(), clave: this.clave }).pipe(
      timeout({ first: 10000 }),
      finalize(() => this.cargando = false),
    ).subscribe({
      next: () => {
        this.router.navigate(['/tienda']);
      },
      error: response => {
        this.error = this.mensajeError(response, 'No se pudo crear la cuenta. Inténtalo de nuevo.', 'El servidor tardó demasiado. Comprueba si la cuenta se creó antes de volver a intentarlo.');
      },
    });
  }

  cambiarModoRegistro(): void {
    this.modoRegistro = !this.modoRegistro;
    this.error = '';
    this.clave = '';
    this.confirmarClave = '';
  }

  mostrarLogin(): void {
    this.modoRegistro = false;
    this.error = '';
    this.clave = '';
    this.confirmarClave = '';
  }

  mostrarRegistro(): void {
    this.modoRegistro = true;
    this.error = '';
    this.clave = '';
    this.confirmarClave = '';
  }

  abrirRecuperacion() {
    this.mostrarRecuperacion = true;
    this.recuperacionEnviada = false;
    this.correoRecuperacion = '';
  }

  cerrarRecuperacion() {
    this.mostrarRecuperacion = false;
  }

  enviarRecuperacion() {
    if (!this.correoValido(this.correoRecuperacion)) {
      this.error = 'Usa un correo @gmail.com o @hotmail.com.';
      return;
    }
    this.auth.recuperarClave(this.correoRecuperacion).subscribe({
      next: () => this.recuperacionEnviada = true,
      error: (response) => this.error = response.error?.error || 'No se pudo procesar la solicitud.',
    });
  }

  get nivelClave(): number {
    if (!this.clave) return 0;
    let nivel = this.clave.length >= 6 ? 1 : 0;
    if (this.clave.length >= 9) nivel++;
    if (/[A-Z]/.test(this.clave) && /[a-z]/.test(this.clave)) nivel++;
    if (/\d/.test(this.clave) || /[^a-zA-Z0-9]/.test(this.clave)) nivel++;
    return Math.min(nivel, 4);
  }

  get textoFortaleza(): string {
    return ['', 'Básica', 'Aceptable', 'Buena', 'Fuerte'][this.nivelClave];
  }

  correoValido(valor: string): boolean {
    return /^[^\s@]+@(gmail|hotmail)\.com$/i.test(valor.trim());
  }

  private mensajeError(response: any, mensajeGenerico: string, mensajeTimeout?: string): string {
    if (response?.name === 'TimeoutError') {
      return mensajeTimeout || 'El servidor tardó demasiado. Inténtalo de nuevo.';
    }
    if (response?.status === 0) {
      return 'No hay conexión con el servidor. Inicia el backend en http://localhost:8082 e inténtalo otra vez.';
    }
    if (response?.status === 404) {
      return 'El backend activo no reconoce esta ruta. Reinicia el backend actualizado y vuelve a intentarlo.';
    }
    return response?.error?.error || mensajeGenerico;
  }
}
