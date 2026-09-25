import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() && auth.rol() === 'admin'
    ? true
    : inject(Router).createUrlTree(['/tienda']);
};