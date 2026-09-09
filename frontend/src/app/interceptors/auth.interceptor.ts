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
 *  - 403 : NOTIFIÉ UNIQUEMENT PAR HttpErrorInterceptor (dédupliqué par
 *    endpoint, cooldown 10 min) — ne pas toaste ici, sinon chaque
 *    chargement de page sans permission génère un toast.
 */
export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
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
      }
      return throwError(() => err);
    })
  );
};
