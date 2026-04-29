// structure.component.ts
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCommonModule } from '@angular/material/core';
import { Structure } from '../../../modeles/structure.model';
import { StructureService, StructuresFilter, StructuresResponse } from '../../../services/structure.service';
import { AuthService } from '../../../services/auth.service'; // Service d'authentification
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { User } from '../../../modeles/user.model';

@Component({
  selector: 'app-structure',
  standalone: true,
  imports: [
    MatCommonModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    NgbModalModule,
    FormsModule,
  ],
  templateUrl: './structure.component.html',
  styleUrl: './structure.component.css',
})
export class StructureComponent implements OnInit, OnDestroy {

  @Input() isGeneralAdmin = false;
  @Input() isAdminStructure = false;
  @Input() code_structure : string|null = null;
  @Input() currentStructureId: number | null = null;
  
  structures: Structure[] = [];
  generalForm!: FormGroup;
  isEditMode = false;
  //isGeneralAdmin = false;
  selectedStructure: Structure | null = null;
  logoPreview: string | ArrayBuffer | null = null;
  searchTerm = '';
  errorMessage = '';
  isloading = true;
  //code_structure: string | null = null;
  currentUser: User | null = null;

  // Pagination et filtres
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;
  
  filters: StructuresFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous'
  };

  // Options pour les filtres
  statutOptions = ['tous', 'actif', 'inactif'];
    
  //private userSubscription!: Subscription;
  private searchSubject = new Subject<string>();


  private fb = inject(FormBuilder);
  private structureService = inject(StructureService);
  private authService = inject(AuthService);
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);
  
  private destroy$ = new Subject<void>();


  ngOnInit(): void {
   /*  this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      this.currentStructureId = user?.structure_id || null;
      console.log('Code structure initialisé :', this.code_structure);
    });
    this.isGeneralAdmin = this.authService.isGeneralAdmin(); */

    this.initForm();
    this.checkUserRole();

     // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      if (this.isGeneralAdmin) {
        this.loadStructures();
      }
    });
    if (this.isGeneralAdmin) {
      this.loadStructures();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    /* if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    } */
  }

  initForm(): void {
    this.generalForm = this.fb.group({
      nom_structure: ['', Validators.required],
      logo: [null],
      //proprietaire: ['', Validators.required],
      nombre_magasins: [1, [Validators.required, Validators.min(1)]],
      type_structure: ['', Validators.required],
      devise: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
      adresse: ['', Validators.required],
      numero_identification_fiscale: [''],
      registre_commerce: [''],
      statut_juridique: [''],
      banque: [''],
      numero_compte: [''],
      fournisseur_mobile_money: [''],
      nombre_employes: [0, Validators.min(0)],
      responsable_administratif: [''],
      horaires_ouverture: [''],
      jours_fermeture: [''],
      secteur_activite: [''],
      surface_vente: [''],
      stock_initial: [''],
      site_web: [''],
      reseaux_sociaux: [''],
      contact_secondaire: [''],
      code_acces: [''],
      personne_confiance: [''],
      assurances_souscrites: [''],
      //date_creation: [''],
      description: [''],
    });
  }

  checkUserRole(): void {
    // À adapter selon votre système d'authentification
    //this.isGeneralAdmin = this.authService.isGeneralAdmin();

    if (!this.isGeneralAdmin) {
      // Si c'est un admin de structure, charger les données de sa structure
      const structureId = this.authService.getUserStructureId();
      if (structureId) {
        this.loadStructureDetails(structureId);
      }
    }
  }

  loadData(): void {
    if (this.isGeneralAdmin) {
    this.loadStructures();
    }
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  get filteredStructures(): Structure[] {
    return this.structures.filter(
      (str) =>
        str.nom_structure.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        str.type_structure.toLowerCase().includes(this.searchTerm.toLowerCase()),
      //magasin.adresse?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Pagination
  getPaginatedStructure(): Structure[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredStructures.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getTotalPages1(): number {
    return Math.ceil(this.filteredStructures.length / this.itemsPerPage);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
  getPages(): number[] {
    const totalPages = this.getTotalPages1();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any): void {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1;
  }

  onSearchChange1(): void {
    this.currentPage = 1;
  }
  /* onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages1()) {
      this.currentPage = page;
    }
  } */

  //.............................................................................
  loadStructures(): void {
    if (!this.isGeneralAdmin) return;

    this.isloading = true;
    this.structureService.getAllBis(this.filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isloading = false)
      )
      .subscribe({
        next: (response: StructuresResponse) => {
          this.structures = response.items;
          
          // Mise à jour de la pagination
          this.totalItems = response.pagination.total;
          this.currentPage = response.pagination.page;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = response.pagination.hasNext;
          this.hasPrev = response.pagination.hasPrev;
        },
        error: (err) => {
          console.error('Erreur chargement structures:', err);
          this.toastr.error('Erreur lors du chargement des structures');
        }
      });
  }

  // Gestionnaires pour les filtres
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadStructures();
    }
  }

  onItemsPerPageChange(limit: number): void {
    this.itemsPerPage = limit;
    this.filters.limit = limit;
    this.filters.page = 1;
    this.loadStructures();
  }

  onStatutChange(statut: string): void {
    this.filters.statut = statut;
    this.filters.page = 1;
    this.loadStructures();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: this.itemsPerPage,
      search: '',
      statut: 'tous'
    };
    this.loadStructures();
  }

  loadStructureDetails(id: number): void {
    this.isloading = true;
    this.structureService
      .getById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isloading = false)
      )
      .subscribe({
        next: (structure) => {
          console.log('Détails de la structure',structure)
          this.selectedStructure = structure;
          this.currentStructureId = structure.id!;
          this.isEditMode = true;
          this.generalForm.patchValue(structure);

          if (structure.logo) {
            this.logoPreview = structure.logo;
          }
        },
        error: (err) => {
          console.error('Erreur chargement structure:', err);
          this.toastr.error('Erreur lors du chargement de la structure');
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showDetails(structure: Structure, content: any): void {
    //console.log('Détails de la structure sélectionnée',structure);
    this.selectedStructure = structure;
    //this.modalService.open(content, { size: 'lg' }); 
    console.log('=== showDetails appelé ===');
    console.log('Structure reçue:', structure);
    console.log('Content modal:', content);
    console.log('Structure sélectionnée après affectation:', this.selectedStructure);
    
    // Vérifions que la structure a bien toutes les propriétés
    console.log('Structure - nom:', structure.nom_structure);
    console.log('Structure - email:', structure.email);
    console.log('Structure - téléphone:', structure.telephone);
    console.log('Structure - adresse:', structure.adresse);
    
    this.selectedStructure = structure;

    //console.log('Structure sélectionnée après affectation:', this.selectedStructure);
    
    // Ouvrir le modal
    const modalRef = this.modalService.open(content, { size: 'lg' });
    console.log('Modal ouvert:', modalRef);
  }

  prepareEdit(structure: Structure): void {
    this.currentStructureId = structure.id!;
    this.isEditMode = true;
    this.generalForm.patchValue(structure);

    if (structure.logo) {
      this.logoPreview = structure.logo;
    }

    // Scroll vers le formulaire
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  toggleStructureStatus(structure: Structure): void {

    const action = structure.estActive ? 'désactiver' : 'activer';
  
  
  if (!confirm(`Êtes-vous sûr de vouloir ${action} la structure?`)) {
    return;
  }
    const newStatus = !structure.estActive;

    this.isloading = true;
    this.structureService
      .updateStatus(structure.id!, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isEditMode = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Statut mis à jour avec succès');
          structure.estActive = newStatus;
          this.loadStructures();
        },
        error: (err) => {
          console.error('Erreur:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du statut';
          this.toastr.error(this.errorMessage);
          structure.estActive = !newStatus;
        },
      });
  }

  onSubmitFormsSetting(): void {
    if (this.generalForm.valid) {
      const formData = this.prepareFormData();

      if (this.isEditMode && this.currentStructureId) {
        this.isloading = true;
        this.structureService
          .update(this.currentStructureId, formData)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isloading = false)
          )
          .subscribe({
            next: () => {
              this.toastr.success('Structure mise à jour avec succès!');
              if (this.isGeneralAdmin) {
                this.loadStructures();
              }
              this.resetForm();
            },
            error: (err) => {
              console.error('Erreur lors de la mise à jour de la structure:', err);
              this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour de la structure';
              this.toastr.error(this.errorMessage);
            },
          });
      } else {
        this.structureService
          .create(formData)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isloading = false)
          )
          .subscribe({
            next: () => {
              this.toastr.success('Structure créée avec succès!');
              if (this.isGeneralAdmin) {
                this.loadStructures();
              }
              this.resetForm();
            },
            error: (err) => {
              console.error('Erreur lors de la création:', err);
              this.errorMessage = err.error?.message || 'Erreur lors de la création de la structure';
              this.toastr.error(this.errorMessage);
            },
          });
      }
    } else {
      alert('Veuillez remplir correctement le formulaire.');
    }
  }

  prepareFormData(): FormData {
    const formData = new FormData();
    const formValue = this.generalForm.value;

    Object.keys(formValue).forEach((key) => {
      if (key !== 'logo' && formValue[key] !== null && formValue[key] !== undefined) {
        formData.append(key, formValue[key]);
      }
    });

    if (this.generalForm.get('logo')?.value instanceof File) {
      formData.append('logo', this.generalForm.get('logo')?.value);
    }

    return formData;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.generalForm.patchValue({ logo: file });

      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  resetForm(): void {
    this.generalForm.reset();
    this.isEditMode = false;
    this.currentStructureId = null;
    this.logoPreview = null;
    this.initForm();
  }

  cancelEdit(): void {
    this.resetForm();
  }

}
