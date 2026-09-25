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
  mostrarRecuperacion = false;
  recuperacionEnviada = false;
  correoRecuperacion = '';
  error = '';
  cargando = false;

  constructor(private router: Router, private auth: AuthService) {}

  ingresar() {
    this.error = '';
    this.cargando = true;
    this.auth.login(this.usuario.trim(), this.clave).pipe(
      timeout({ each: 5000 }),
      finalize(() => this.cargando = false),
    ).subscribe({
      next: () => this.router.navigate(['/tienda']),
      error: (response) => {
        this.error = response.error?.error || 'No se pudo iniciar sesión. Verifica que el backend esté iniciado.';
      },
    });
  }

  registrar() {
    this.error = '';
    if (this.clave !== this.confirmarClave) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.cargando = true;
    this.auth.registrar({ nombre: this.nombre.trim(), usuario: this.usuario.trim(), correo: this.correo.trim(), clave: this.clave }).pipe(
      timeout({ each: 5000 }),
      finalize(() => this.cargando = false),
    ).subscribe({
      next: () => {
        this.router.navigate(['/tienda']);
      },
      error: response => {
        this.error = response.error?.error || 'No se pudo crear la cuenta. Verifica que el backend esté iniciado.';
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
    this.auth.recuperarClave(this.correoRecuperacion).subscribe({
      next: () => this.recuperacionEnviada = true,
      error: (response) => this.error = response.error?.error || 'No se pudo procesar la solicitud.',
    });
  }
}