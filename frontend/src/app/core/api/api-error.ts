/**
 * Contrat d'erreur HTTP unifié pour tous les services de l'application.
 *
 * Règles :
 * - Un service ne doit JAMAIS remplacer une erreur HTTP par `new Error(message)`
 *   (on perd le statut et le corps de la réponse).
 * - Un service ne doit JAMAIS afficher de toast : c'est le rôle du composant
 *   (métier) et de l'interceptor (401/403).
 * - Toute erreur traversant un service doit être une instance d'`ApiError`.
 */
import { HttpErrorResponse } from '@angular/common/http';
import type { NGXLogger } from 'ngx-logger';
import { Observable, throwError } from 'rxjs';

export interface ApiErrorInit {
  /** Statut HTTP (0 pour une erreur réseau, undefined pour une erreur applicative). */
  status?: number;
  /** URL de la requête concernée, si connue. */
  url?: string;
  /** Corps de la réponse backend (objet, string, blob...). */
  details?: unknown;
  /** Erreur d'origine (ErrorEvent, HttpErrorResponse...). */
  cause?: unknown;
}

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status?: number;
  readonly url?: string;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(message: string, init: ApiErrorInit = {}) {
    super(message);
    this.status = init.status;
    this.url = init.url;
    this.details = init.details;
    this.cause = init.cause;
  }

  /** True si la requête n'a jamais atteint le serveur (réseau coupé, DNS...). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Extrait le message le plus exploitable depuis une HttpErrorResponse. */
export function extractBackendMessage(error: HttpErrorResponse): string {
  const body: unknown = error.error;

  // Cas classique backend Express : { message: '...' }
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  if (typeof body === 'string' && body.length > 0 && body.length < 500) {
    return body;
  }
  return error.message || 'Erreur inconnue du serveur';
}

/** Transforme une erreur inconnue en ApiError normalisée. */
export function toApiError(error: unknown, fallbackMessage = 'Une erreur est survenue'): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof HttpErrorResponse) {
    return new ApiError(extractBackendMessage(error), {
      status: error.status,
      url: error.url ?? undefined,
      details: error.error,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || fallbackMessage, { cause: error });
  }

  return new ApiError(fallbackMessage, { cause: error });
}

/**
 * Fabrique du handler d'erreurs unique pour tous les services.
 * Usage dans un service :
 *   catchError(err => handleApiError(this.logger, 'ClientsService.getClients', err))
 *
 * Comportement :
 * 1. log technique via ngx-logger (niveau ERROR) ;
 * 2. relance TOUJOURS une ApiError (statut + message backend préservés),
 *    pour que le composant puisse afficher un message métier.
 */
export function handleApiError(
  logger: Pick<NGXLogger, 'error'>,
  context: string,
  error: unknown,
  fallbackMessage = 'Une erreur est survenue'
): Observable<never> {
  const apiError = toApiError(error, fallbackMessage);
  logger.error(`[${context}]`, {
    status: apiError.status,
    message: apiError.message,
    details: apiError.details instanceof Blob ? '<blob>' : apiError.details,
  });
  return throwError(() => apiError);
}
