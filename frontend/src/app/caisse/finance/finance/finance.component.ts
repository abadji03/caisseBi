import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Categorie, Depense, Recette } from '../../../modeles/finance.model';
import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { DepensesComponent } from '../depenses/depenses.component';
import { RecettesComponent } from '../recettes/recettes.component';
import { CategorieDepenseRecetteComponent } from '../categorie-depense-recette/categorie-depense-recette.component';
import { ModePaiement } from '../../../modeles/paiement.model';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DepensesComponent, RecettesComponent, CategorieDepenseRecetteComponent],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent implements OnInit,OnDestroy {
  // Onglet actif
  activeTab = 'depenses';
  
  // Références aux composants enfants
  @ViewChild(DepensesComponent) depensesComponent!: DepensesComponent;
  @ViewChild(RecettesComponent) recettesComponent!: RecettesComponent;
  @ViewChild(CategorieDepenseRecetteComponent) categoriesComponent!: CategorieDepenseRecetteComponent;
  
  // Données partagées
  categories: Categorie[] = [];
  categoriesDepense: Categorie[] = [];
  categoriesRecette: Categorie[] = [];

  modesPaiement: ModePaiement[] = [
            new ModePaiement({ libelle: 'Espèce' }),
            new ModePaiement({ libelle: 'Carte' }),
            new ModePaiement({ libelle: 'Virement' }),
             new ModePaiement({ libelle: 'Wave' }),
            new ModePaiement({ libelle: 'Orange Money' }),
            new ModePaiement({ libelle: 'Chèque' }),
            new ModePaiement({ libelle: 'Autre' }),
            
          ];
  
  // États globaux
  isLoading = false;
  isAdmin = false;
  errorMessage = '';
  
  // Informations utilisateur/structure
  code_structure: string | null = null;
  magasinId: number | null = null;
  agentId: number | null = null;
  //currentUser: User | null = null;

  private destroy$ = new Subject<void>();
  private userSubscription!: Subscription;
  
  private authService = inject(AuthService);
  private categorieService = inject(CategoriesDepencesRecettesService);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      //this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur');
      
      // Charger les catégories après avoir l'utilisateur
      if (this.code_structure) {
        this.loadCategories();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Charger les catégories (données partagées)
   */
  loadCategories(): void {
    if (!this.code_structure) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.categorieService.getAllByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (categories) => {
          this.categories = categories;

          // Séparation selon le type
          this.categoriesDepense = categories.filter(
            cat => cat.type === 'DEPENSE'
          );

          this.categoriesRecette = categories.filter(
            cat => cat.type === 'RECETTE'
          );
          
          console.log('Catégories chargées:', categories.length);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des catégories';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement catégories:', err);
        }
      });
  }

  /**
   * Recharger les catégories (appelé par les enfants quand nécessaire)
   */
  refreshCategories(): void {
    this.loadCategories();
    // Notifier les composants enfants du changement
    if (this.depensesComponent) {
      this.depensesComponent.onCategoriesChange(this.categories);
    }
    if (this.recettesComponent) {
      this.recettesComponent.onCategoriesChange(this.categories);
    }
  }

  /**
   * Gestion du changement d'onglet
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    // Réinitialiser les messages d'erreur
    this.errorMessage = '';
    
    // Recharger les données si nécessaire lors du changement d'onglet
    if (tab === 'categories' && this.categoriesComponent) {
      this.categoriesComponent.loadCategories();
    }
  }

  /**
   * Gestionnaire d'événements pour les actions des composants enfants
   */
  onCategoryAction(event: { action: string; category: Categorie }): void {
    switch (event.action) {
      case 'created':
      case 'updated':
      case 'deleted':
      case 'toggled':
        // Rafraîchir les catégories pour tous les composants
        this.refreshCategories();
        break;
    }
  }

  onDepenseAction(event: { action: string; depense: Depense }): void {
    // Logique supplémentaire si nécessaire
    console.log('Action dépense:', event.action);
  }

  onRecetteAction(event: { action: string; recette: Recette }): void {
    // Logique supplémentaire si nécessaire
    console.log('Action recette:', event.action);
  }

  /**
   * Vérifier si l'utilisateur a les droits nécessaires
   */
  hasPermission(_permission: string): boolean {
    // Implémentez votre logique de permissions ici
    return true; // Par défaut
  }
}
