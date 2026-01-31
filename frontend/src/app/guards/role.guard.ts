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

  // Vérifier si l'utilisateur est authentifié
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const expectedRoles = route.data['roles'] as string[];
  const requiredPermissions = route.data['permissions'] as string[];
 
 let isAuthorized = false;

 // Vérification par rôle
  if (expectedRoles && expectedRoles.length > 0) {
    isAuthorized = expectedRoles.some(role => authService.hasRole(role));
  }

  // Vérification par permission (plus granulaire)
  if (requiredPermissions && requiredPermissions.length > 0) {
    isAuthorized = requiredPermissions.every(permission => 
      authService.hasPermission(permission)
    );
  }

  // Si aucun critère n'est spécifié, l'accès est autorisé
  if (!expectedRoles && !requiredPermissions) {
    return true;
  }

  if (isAuthorized) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
