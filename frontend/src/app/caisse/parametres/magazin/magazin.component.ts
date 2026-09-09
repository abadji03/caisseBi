/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';
import { User } from '../../../modeles/user.model';
import { UserService } from '../../../services/user.service';
import { MaagasinsService, MagasinsFilter } from '../../../services/maagasins.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-magazin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './magazin.component.html',
  styleUrl: './magazin.component.css',
})
export class MagazinComponent implements OnInit, OnDestroy {
  showPartie1 = true;
  isloading = false;

  errorMessage = '';

  // Pagination et filtres
  magasinsCurrentPage = 1;
  magasinsItemsPerPage = 10;
  magasinsTotalItems = 0;
  magasinsTotalPages = 0;
  magasinsHasNext = false;
  magasinsHasPrev = false;
  
  // Filtres
  magasinsFilters: MagasinsFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous'
  };

  // Options pour les filtres
  statutOptions = ['tous', 'Actif', 'Inactif'];

  private searchSubject = new Subject<string>();


  currentDate: Date = new Date();
  modeEdition = false;
  magasinForm!: FormGroup;
  // Liste des magasins (à remplacer par un appel à un service API)
  magasins: Magasin[] = [];
  responsables: User[] = [];
  allUsers: User[] = [];

  selectedMagasinId: number | null = null;
  searchTerm = '';

  private destroy$ = new Subject<void>();

  magasinSelectionne: Magasin | null = null;

  showFormIndex: number | null = null;
  magasinDestinataire: string | null = null;
  quantite!: number;
  motif = '';

  isLoadingMagasin = false;
  pageSize = 5;

  selectedPanierId: number | null = null;

  code_structure: string | null = null;

  private userSubscription!: Subscription;

  private fb = inject(FormBuilder);
  //private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  //private structureService = inject(StructureService);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);
   private authService = inject(AuthService);

  ngOnInit(): void {

    this.userSubscription = this.authService.currentUser.subscribe(user => {
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      if (this.code_structure) {
        this.loadMagasinsWithPagination();
      }
    });
    //this.chargerMagasins();
    this.loadAllUsers();
    this.iniMagasinForm();

    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.magasinsFilters.search = searchTerm;
      this.magasinsFilters.page = 1;
      this.loadMagasinsWithPagination();
    });
    
  }

 ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  iniMagasinForm(){
    this.magasinForm = this.fb.group({
      code_structure: this.code_structure,
      nom: ['', Validators.required],
      adresse: ['', Validators.required],
      ville: [''],
      telephone: [''],
      email: ['', [Validators.email]],
      //responsableId: ['', Validators.required],
      capaciteStock: [0],
      statut: ['Actif'],
    });
  }
  // Charger les magasins avec pagination
  loadMagasinsWithPagination(): void {
    if (!this.code_structure) return;

    const filters: MagasinsFilter = {
      page: this.magasinsFilters.page,
      limit: this.magasinsItemsPerPage,
      search: this.magasinsFilters.search || undefined,
      statut: this.magasinsFilters.statut !== 'tous' ? this.magasinsFilters.statut : undefined
    };

    this.isLoadingMagasin = true;
    this.magasinService.getMagasinsByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingMagasin = false))
      .subscribe({
        next: (response) => {
          this.magasins = response.items;
          
          // Mise à jour de la pagination
          this.magasinsTotalItems = response.pagination.total;
          this.magasinsCurrentPage = response.pagination.page;
          this.magasinsTotalPages = response.pagination.totalPages;
          this.magasinsHasNext = response.pagination.hasNext;
          this.magasinsHasPrev = response.pagination.hasPrev;
          
          if (this.magasins.length > 0 && !this.magasinSelectionne) {
            this.magasinSelectionne = this.magasins[0];
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des magasins', err);
        }
      });
  }

 chargerMagasins(): void {
    this.loadMagasinsWithPagination();
  }

  // Gestionnaires d'événements
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.magasinsTotalPages) {
      this.magasinsFilters.page = page;
      this.loadMagasinsWithPagination();
    }
  }

  onItemsPerPageChange(limit: number): void {
    this.magasinsItemsPerPage = limit;
    this.magasinsFilters.limit = limit;
    this.magasinsFilters.page = 1;
    this.loadMagasinsWithPagination();
  }

  onStatutChange(statut: string): void {
    this.magasinsFilters.statut = statut;
    this.magasinsFilters.page = 1;
    this.loadMagasinsWithPagination();
  }

  resetFilters(): void {
    this.magasinsFilters = {
      page: 1,
      limit: this.magasinsItemsPerPage,
      search: '',
      statut: 'tous'
    };
    this.loadMagasinsWithPagination();
  }

  toggleDetails(panierId: number) {
    this.selectedPanierId = this.selectedPanierId === panierId ? null : panierId;
  }

  toggleParts(): void {
    this.showPartie1 = !this.showPartie1;
  }

  afficherDetailsMagasin(magasin: Magasin) {
    this.magasinSelectionne = magasin;
  }

  loadUsersForSelectedStructure(code_structure: string): void {
    this.userService.getByStructure(code_structure)
    .pipe(takeUntil(this.destroy$))
    .subscribe((data) => {
      this.responsables = data;
      //console.log(this.responsables.length)
    });
  }

  loadAllUsers(): void {
    this.isloading  = true;
    this.userService.getAlls()
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isloading = false)
    )
    .subscribe((data) => {
      this.allUsers = data;
    });
  }


  nouveauMagasin(): void {
    this.modeEdition = false;
    this.magasinSelectionne = null;
    this.errorMessage = '';

    // this.magasinForm.reset({
    //   statut: 'Actif',
    //   capaciteStock: 0,
    // });
    this.magasinForm.reset({
    code_structure: this.code_structure, // Pré-remplir avec la structure de l'utilisateur
    nom: '',
    adresse: '',
    ville: '',
    telephone: '',
    email: '',
    capaciteStock: 0,
    statut: 'Actif',
  });
  }

  
  preparerEditionMagasin(magasin: Magasin): void {
    this.modeEdition = true;
    this.magasinSelectionne = magasin; // ← AJOUTEZ CETTE LIGNE !!!
    this.errorMessage = ''; // Réinitialiser les messages d'erreur
    this.magasinForm.patchValue({
      nom: magasin.nom,
      adresse: magasin.adresse,
      ville: magasin.ville,
      telephone: magasin.telephone,
      email: magasin.email,
      //responsableId: magasin.responsableId,
      capaciteStock: magasin.capaciteStock,
      code_structure: magasin.code_structure,
      statut: magasin.statut,
    });

    if (magasin.code_structure) {
      this.loadUsersForSelectedStructure(magasin.code_structure);
    }
  }

  ajouterMagasin(): void {
    if (!this.code_structure) {
      this.errorMessage = 'Code structure manquant';
      this.toastr.error(this.errorMessage);
      return;
    }

    if (this.magasinForm.valid) {

      const data = {...this.magasinForm.value, code_structure:this.code_structure};

       this.isLoadingMagasin = true;
      this.magasinService.createMagasin(data)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMagasin = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Magasin créé avec succès');
          //this.magasins.push(magasin);
          this.chargerMagasins();
          //this.magasinSelectionne = magasin;
          this.fermerModal();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création du magasin';
          this.toastr.error(this.errorMessage);
          //console.error('Erreur lors de la création du magasin', err)
        },
      });
    }
    else {
      this.errorMessage = 'Formulaire invalide';
      this.toastr.error(this.errorMessage);
      return;
    }
  }

  modifierMagasin(): void {

      // Vérifier que le formulaire est valide ET qu'un magasin est sélectionné
      if (!this.magasinForm.valid) {
        this.errorMessage = 'Formulaire invalide';
        this.toastr.error(this.errorMessage);
        return;
      }

      if (!this.magasinSelectionne) {
        this.errorMessage = 'Aucun magasin sélectionné pour la modification';
        this.toastr.error(this.errorMessage);
        return;
      }
      // Préparer les données avec l'ID du magasin sélectionné
      const updatedMagasin = { 
        ...this.magasinForm.value, 
        code_structure: this.magasinSelectionne.code_structure // Garder la structure d'origine
      };
      

      this.isLoadingMagasin = true;
      this.magasinService.updateMagasin(this.magasinSelectionne.id, updatedMagasin)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingMagasin = false)
    )
      .subscribe({
        next: () => {
          this.chargerMagasins();
          this.toastr.success('Magasin mis à jour avec succès');
          this.fermerModal();
          this.magasinSelectionne = null;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du magasin';
          this.toastr.error(this.errorMessage);
          //console.error('Erreur lors de la mise à jour du magasin', err)
        },
      });
   
  }

  supprimerMagasin(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce magasin ?')) {
      this.magasinService.deleteMagasin(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Magasin supprimé avec succès');
          this.chargerMagasins();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors  de la suppression du magasin';
          this.toastr.error(this.errorMessage);
          //console.error('Erreur lors de la suppression du magasin', err);
        },
      });
    }
  }

  fermerModal(): void {
    // Fermer le modal Bootstrap
    this.magasinForm.reset({
      statut: 'Actif',
      capaciteStock: 0,
    });
    
    // Réinitialiser les variables d'état
    this.modeEdition = false;
    this.magasinSelectionne = null;
    this.errorMessage = '';

    const modal = document.getElementById('modalMagasin');
    if (modal) {
      (window as any).bootstrap.Modal.getInstance(modal).hide();
      /* if (modalInstance) {
        modalInstance.hide();
      } */
    }
  }

 
  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Gestion des détails
  toggleDetailsMagasin(magasinId: number): void {
    this.selectedMagasinId = this.selectedMagasinId === magasinId ? null : magasinId;
  }

  getSelectedMagasin(): Magasin | undefined {
    return this.magasins.find((m) => m.id === this.selectedMagasinId);
  }

  // Gestion du statut
  toggleStatutMagasin(magasin: Magasin): void {
    const newStatut = magasin.statut === 'Actif' ? 'Inactif' : 'Actif';
    this.magasinService.updateMagasinStatus(magasin.id, newStatut)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.toastr.success('Magasin mis à jour avec succès');
        this.chargerMagasins();
      },
      error: (err) => {
        console.error('Erreur lors du changement de statut', err);
        this.errorMessage = err.error?.message || 'Erreur lors du changement de statut';
        this.toastr.error(this.errorMessage);
      },
    });
  }

  // Sélection d'un magasin pour les onglets de détails
  selectMagasin(magasin: Magasin): void {
    this.magasinSelectionne = magasin;
    // Scroll vers la section des détails si nécessaire
  }

  // Dans ton composant TypeScript
  getResponsable(magasin: any) {
    return magasin.users?.find((user: any) =>
      user.roles?.some((role: any) => role.nom === 'Gérant')
    );
  }

  getUserRoles(user: any): string {
    return user?.['roles']?.map((r: any) => r.nom).join(', ') || '';
  }

}
