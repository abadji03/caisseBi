import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

/**
 * Gestion centralisée des erreurs HTTP.
 *
 * Règles :
 *  - TOUTES les erreurs sont loggées ( NGXLogger) ;
 *  - les erreurs de CHARGEMENT (GET) affichent un toast unique, dédupliqué
 *    par code + endpoint (fenêtre de cooldown) ;
 *  - EXCEPTION : 403 sur GET = section sans permission pour ce profil →
 *    état normal, log silencieux, AUCUN toast (ni error ni warning) ;
 *  - les erreurs d'ACTION (POST/PUT/PATCH/DELETE) restent gérées par les
 *    composants qui ont le contexte métier — pas de doublon ici.
 */

const COOLDOWN_MS = 5000;        // même erreur sur le même endpoint : 1 toast / 5 s

const horodatageDernierToast = new Map<string, number>();

function toastDeduplique(
  toastr: ToastrService,
  cle: string,
  cooldownMs: number,
  afficher: () => void
): void {
  const maintenant = Date.now();
  const dernier = horodatageDernierToast.get(cle) ?? 0;
  if (maintenant - dernier < cooldownMs) return;
  horodatageDernierToast.set(cle, maintenant);
  afficher();
}

function messageParStatut(status: number): string {
  switch (status) {
    case 0:
      return 'Serveur injoignable — vérifiez votre connexion';
    case 400:
      return 'Requête invalide';
    case 401:
      return 'Session expirée — reconnectez-vous';
    case 403:
      return 'Droits insuffisants pour cette section';
    case 404:
      return 'Ressource introuvable';
    case 409:
      return 'Opération refusée : état de la ressource incompatible';
    case 500:
      return 'Erreur serveur — réessayez ou contactez le support si cela persiste';
    default:
      return status >= 500
        ? 'Erreur serveur'
        : 'Une erreur est survenue';
  }
}

/** Endpoint lisible pour la clé de dédup (sans query, id numérique neutralisé). */
function cleEndpoint(url: string): string {
  return url
    .split('?')[0]
    .replace(/\/api\//, '/')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

export const HttpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(NGXLogger);
  const toastr = inject(ToastrService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      logger.error('Erreur HTTP', {
        method: req.method,
        url: req.urlWithParams,
        status: error.status,
        message: error.message,
        details: error.error,
      });

      // Toasts : uniquement pour les chargements (GET) qui échouent, hors 403.
      // - 403 GET = section sans permission : état normal pour un profil
      //   restreint → log silencieux, pas de toast (l'UI devrait masquer les
      //   sections non autorisées via les permissions).
      // - Les actions (POST/PUT/PATCH/DELETE) sont notifiées par les
      //   composants, qui affichent le message métier du backend.
      if (req.method === 'GET' && error.status !== 403) {
        const cle = `${error.status}|${cleEndpoint(req.urlWithParams)}`;
        const message =
          (error.error && (error.error.message || error.error.error)) ||
          messageParStatut(error.status);

        toastDeduplique(toastr, cle, COOLDOWN_MS, () => {
          if (error.status === 401) {
            toastr.error(message, 'Session');
          } else {
            toastr.error(message);
          }
        });
      }

      return throwError(() => error);
    })
  );
};