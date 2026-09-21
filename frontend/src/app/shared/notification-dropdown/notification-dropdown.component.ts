import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import {
  formatDateRelative,
  getNotificationIcon,
  getPrioriteClass,
  Notification,
  NotificationType,
} from '../../modeles/notification.model';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private svc = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  notifications: Notification[] = [];
  nonLuesSeulment = false;
  isLoading = false;
  isOpen = false;

  // Exposer les fonctions utilitaires au template
  getIcon  = getNotificationIcon;
  getPriority = getPrioriteClass;
  formatDate = formatDateRelative;

  ngOnInit(): void {
    this.svc.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifs => {
        this.notifications = notifs;
        this.cdr.markForCheck();
      });

    this.svc.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.cdr.markForCheck();
      });
  }

  // ── Ouvrir / fermer le dropdown ───────────────────────────────────────────
  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.notifications.length === 0) {
      this.svc.chargerNotifications(1, this.nonLuesSeulment);
    }
  }

  fermer(): void { this.isOpen = false; }

  // ── Filtrer ───────────────────────────────────────────────────────────────
  toggleFiltreNonLues(): void {
    this.nonLuesSeulment = !this.nonLuesSeulment;
    this.svc.chargerNotifications(1, this.nonLuesSeulment);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  onOuvrir(notif: Notification): void {
    this.svc.ouvrirNotification(notif);
    this.isOpen = false;
  }

  onSupprimer(event: Event, notif: Notification): void {
    event.stopPropagation();
    this.svc.supprimer(notif.id);
  }

  marquerToutesLues(): void {
    this.svc.marquerToutesLues();
  }

  chargerPlus(): void {
    const page = Math.floor(this.notifications.length / 20) + 1;
    this.svc.chargerNotifications(page, this.nonLuesSeulment);
  }

  // ── Utilitaires template ─────────────────────────────────────────────────
  get aDesNotifications(): boolean {
    return this.notifications.length > 0;
  }

  get aPlusDePage(): boolean {
    return this.notifications.length < this.svc.totalPages * 20;
  }

  trackById(_: number, n: Notification): number {
    return n.id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
