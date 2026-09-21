import { inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, interval, Observable, Subject, Subscription } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import {
  Notification,
  NotificationCountResponse,
  NotificationResponse,
} from '../modeles/notification.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  // ── État interne ──────────────────────────────────────────────────────────
  private readonly _notifications$ = new BehaviorSubject<Notification[]>([]);
  private readonly _count$          = new BehaviorSubject<number>(0);
  private readonly _loading$        = new BehaviorSubject<boolean>(false);
  private readonly destroy$         = new Subject<void>();
  private pollingSubscription: Subscription | null = null;

  // ── Observables publics ───────────────────────────────────────────────────
  readonly notifications$ = this._notifications$.asObservable();
  readonly count$         = this._count$.asObservable();
  readonly loading$       = this._loading$.asObservable();

  // ── Pagination ────────────────────────────────────────────────────────────
  private currentPage   = 1;
  private readonly pageSize = 20;
  totalPages = 1;

  // ── Dépendances ───────────────────────────────────────────────────────────
  private http        = inject(HttpClient);
  private router      = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    // Démarrer le polling dès qu'un utilisateur est connecté
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.id) {
          this.demarrerPolling();
        } else {
          this.arreterPolling();
          this._count$.next(0);
          this._notifications$.next([]);
        }
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Polling  (badge rafraîchi toutes les 60s)
  // ──────────────────────────────────────────────────────────────────────────
  private demarrerPolling(): void {
    if (this.pollingSubscription) return; // déjà actif

    // Charge immédiate au démarrage
    this.rafraichirCount();

    // Puis toutes les 60 secondes
    this.pollingSubscription = interval(60_000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.http.get<NotificationCountResponse>(`${this.apiUrl}/count`).pipe(
          catchError(() => [{ count: this._count$.value }])
        ))
      )
      .subscribe(res => this._count$.next((res as NotificationCountResponse).count ?? 0));
  }

  private arreterPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Récupérer le compteur seul (pour le badge)
  // ──────────────────────────────────────────────────────────────────────────
  rafraichirCount(): void {
    this.http.get<NotificationCountResponse>(`${this.apiUrl}/count`)
      .pipe(catchError(() => [{ count: 0 }]))
      .subscribe(res => this._count$.next((res as NotificationCountResponse).count ?? 0));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Charger la liste (pour le dropdown)
  // ──────────────────────────────────────────────────────────────────────────
  chargerNotifications(page = 1, nonLuesSeulment = false): void {
    this._loading$.next(true);
    this.currentPage = page;

    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', this.pageSize.toString())
      .set('nonLuesSeulment', nonLuesSeulment.toString());

    this.http.get<NotificationResponse>(this.apiUrl, { params })
      .pipe(
        catchError(err => {
          console.error('[NotificationService] chargerNotifications:', err);
          this._loading$.next(false);
          return [];
        }),
        tap(() => this._loading$.next(false))
      )
      .subscribe(res => {
        if (!res) return;
        const r = res as NotificationResponse;
        // Si page 1 : remplacer. Sinon : accumuler (scroll infini possible)
        const existant = page === 1 ? [] : this._notifications$.value;
        this._notifications$.next([...existant, ...r.notifications]);
        this._count$.next(r.nonLues);
        this.totalPages = r.totalPages;
        this._loading$.next(false);
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Marquer une notification comme lue
  // ──────────────────────────────────────────────────────────────────────────
  marquerComeLue(id: number): void {
    this.http.patch<{ success: boolean; notification: Notification }>(
      `${this.apiUrl}/${id}/lire`, {}
    ).subscribe({
      next: res => {
        // Mettre à jour localement sans recharger
        const updated = this._notifications$.value.map(n =>
          n.id === id ? { ...n, lu: true, luAt: new Date().toISOString() } : n
        );
        this._notifications$.next(updated);
        const nonLues = Math.max(0, this._count$.value - 1);
        this._count$.next(nonLues);
      },
      error: err => console.error('[NotificationService] marquerComeLue:', err),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Marquer toutes comme lues
  // ──────────────────────────────────────────────────────────────────────────
  marquerToutesLues(): void {
    this.http.patch<{ success: boolean; nbMaj: number }>(
      `${this.apiUrl}/lire-tout`, {}
    ).subscribe({
      next: () => {
        const updated = this._notifications$.value.map(n => ({ ...n, lu: true, luAt: new Date().toISOString() }));
        this._notifications$.next(updated);
        this._count$.next(0);
      },
      error: err => console.error('[NotificationService] marquerToutesLues:', err),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Supprimer une notification
  // ──────────────────────────────────────────────────────────────────────────
  supprimer(id: number): void {
    this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`)
      .subscribe({
        next: () => {
          const notif = this._notifications$.value.find(n => n.id === id);
          const updated = this._notifications$.value.filter(n => n.id !== id);
          this._notifications$.next(updated);
          if (notif && !notif.lu) {
            this._count$.next(Math.max(0, this._count$.value - 1));
          }
        },
        error: err => console.error('[NotificationService] supprimer:', err),
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Naviguer vers le lien d'action et marquer comme lue
  // ──────────────────────────────────────────────────────────────────────────
  ouvrirNotification(notif: Notification): void {
    if (!notif.lu) this.marquerComeLue(notif.id);
    if (notif.lienAction) this.router.navigateByUrl(notif.lienAction);
  }

  // ──────────────────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
