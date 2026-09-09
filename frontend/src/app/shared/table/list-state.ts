/**
 * Contrat d'état d'une liste paginée (voir audit : états loading/success/empty/error
 * ne doivent plus être confondus).
 *
 * - 'idle'    : initial, aucune requête lancée
 * - 'loading' : requête en cours (garde les anciennes données affichables)
 * - 'success' : requête OK avec au moins un élément
 * - 'empty'   : requête OK mais 0 élément (≠ erreur !)
 * - 'error'   : requête échouée
 */
export type ListState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

/** Calcule l'état d'affichage d'une liste après une requête. */
export function toListState(loading: boolean, hasError: boolean, items: readonly unknown[] | null | undefined): ListState {
  if (loading) return 'loading';
  if (hasError) return 'error';
  if (items && items.length > 0) return 'success';
  if (items) return 'empty';
  return 'idle';
}

/** Données de pagination normalisées, telles que renvoyées par le backend. */
export interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
