
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
 
  // Aligné sur le backend (auth.middleware.js / requirePermission) :
  //  - sémantique ANY-of pour les permissions (some, pas every) ;
  //  - rôles ET permissions combinés en OU : suffit d'être autorisé
  //    par l'un des deux critères pour accéder à la route.
  const roleCheck = expectedRoles?.length
    ? expectedRoles.some(role => authService.hasRole(role))
    : null;

  const permissionCheck = requiredPermissions?.length
    ? requiredPermissions.some(permission => authService.hasPermission(permission))
    : null;

  // Si aucun critère n'est spécifié, l'accès est autorisé
  if (roleCheck === null && permissionCheck === null) {
    return true;
  }

  const isAuthorized = roleCheck === true || permissionCheck === true;

  if (isAuthorized) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
