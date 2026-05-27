import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para rutas de invitado (login, register).
 * Si el usuario ya está autenticado, redirige al dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getAccessToken()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
