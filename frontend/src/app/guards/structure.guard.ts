import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const structureGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requireStructure = route.data['requireStructure'] as boolean;

  if (!requireStructure) {
    return true; // Pas besoin de structure pour cette route
  }

  const user = authService.getCurrentUser();
  
  // Si l'utilisateur est admin général, il ne peut pas accéder aux routes de structure
  if (authService.isGeneralAdmin()) {
    console.log('Admin général tentant d\'accéder à une route de structure - Redirection');
    return router.createUrlTree(['/caisse-bi/admin-general/structure']);
  }

  // Vérifier que l'utilisateur a une structure
  if (!user?.structure_id) {
    console.log('Utilisateur sans structure tentant d\'accéder à une route de structure');
    return router.createUrlTree(['/unauthorized']);
  }

  return true;

};
