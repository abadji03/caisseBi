import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const generalAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Seul l'admin général peut accéder
  if (authService.isGeneralAdmin()) {
    return true;
  }

  // Les autres utilisateurs sont redirigés vers leur dashboard
  return router.createUrlTree(['/caisse-bi/overview']);

};
