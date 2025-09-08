/* import { CanActivateFn } from '@angular/router';

export const roleGuard: CanActivateFn = (route, state) => {
  return true;
};
 */
// guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data['roles'] as string[];

  const isAuthorized =
    authService.isAuthenticated() && expectedRoles.some((role) => authService.hasRole(role));

  if (isAuthorized) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
