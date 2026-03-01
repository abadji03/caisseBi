import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { User } from '../../../modeles/user.model';
import { AuthService } from '../../../services/auth.service';
import { MouvementComponent } from '../mouvement/mouvement.component';
import { ReconciliationComponent } from '../reconciliation/reconciliation.component';
import { AnalyseEcartsComponent } from '../analyse-ecarts/analyse-ecarts.component';
@Component({
  selector: 'app-entrees-sorties',
  standalone: true,
  imports: [
    CommonModule,
    MouvementComponent,
    ReconciliationComponent,
    AnalyseEcartsComponent
  ],
  templateUrl: './entrees-sorties.component.html',
  styleUrl: './entrees-sorties.component.css'
})
export class EntreesSortiesComponent implements OnInit, OnDestroy {
  code_structure: string | null = null;
  agentId: number | null = null;
  magasinId: number | null = null;
  currentUser: User | null = null;
  
  private userSubscription!: Subscription;
  private authService = inject(AuthService);

  ngOnInit() {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}