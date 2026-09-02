import { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Intercepteur HTTP global :
 *  - ajoute le token JWT aux requêtes
 *  - 401 : session expirée/invalide → nettoyage + redirection /login
 *  - 403 : droits insuffisants → notification (l'utilisateur reste où il est)
 */
export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !router.url.startsWith('/login')) {
        authService.sessionExpired();
      } else if (err.status === 403) {
        toastr.error('Vous n\'avez pas les droits nécessaires pour cette action.', 'Accès refusé');
      }
      return throwError(() => err);
    })
  );
};
