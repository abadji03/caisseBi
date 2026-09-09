/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../../modeles/user.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService, UsersFilter } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { Structure } from '../../../modeles/structure.model';
import { AuthService } from '../../../services/auth.service';
import { StructureService } from '../../../services/structure.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, map, Observable, of, Subject, Subscription, takeUntil } from 'rxjs';
import { RolePermissionsService } from '../../../services/role-permissions.service';
import { Role } from '../../../modeles/role-permission.model';
import { ToastrService } from 'ngx-toastr';
import { Magasin } from '../../../modeles/magasin.model';
import { MaagasinsService } from '../../../services/maagasins.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent implements OnInit, OnDestroy {
  users: User[] = [];
  structures: Structure[] = [];
  userForm!: FormGroup;
  isEditMode = false;
  selectedUser: User | null = null;
  isGeneralAdmin = false;
  selectedUserId: number | null = null;
  isLoading = false;
  roles: Role[] = [];
  userRolesMap: Record<number, string[]> = {};

  private destroy$ = new Subject<void>();

  code_structure: string | null = null;
  
  private userSubscription!: Subscription;

  //Propriétés pour la pagination
  usersCurrentPage = 1;
  usersItemsPerPage = 10;
  usersTotalItems = 0;
  usersTotalPages = 0;
  usersHasNext = false;
  usersHasPrev = false;
  
  // Filtres pour les utilisateurs
  usersFilters: UsersFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous'
  };

  // Options pour les filtres
  userStatutOptions = ['tous', 'actif', 'inactif'];

  private usersSearchSubject = new Subject<string>();

  structuresWithoutAdmin: Structure[] = [];

  showStructureField = false;
  userStructures: Structure[] = [];
  currentUserStructureId: number | null = null;
  selectedStructureId: number | null = null;

  magasins: Magasin[] = [];
  showMagasinField = false;
  isStructureAdmin = false;
  isAdminSecondaire = false;
  selectedRoleIds: number[] = [];
  adminRoleId = 0; // ID du rôle "Administrateur de structure"
  otherRoles:number[] = []; // IDs des autres rôles (Gérant, Caissier, Employé)
  userRoleType: 'general_admin' | 'structure_admin' | 'secondary_admin' | 'other' = 'other';
  secondaryAdminRoleId = 0;

  // Propriétés pour la visibilité des mots de passe
  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private structureService = inject(StructureService);
  private roleService = inject(RolePermissionsService);
  private toastr = inject(ToastrService);
  private modalService = inject(NgbModal);
  private magasinService = inject(MaagasinsService);


  ngOnInit(): void {
    
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      // Déterminer si on doit montrer le champ structure
      this.showStructureField = this.authService.isGeneralAdmin();
      this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID
      this.isAdminSecondaire = this.authService.hasRole('Administrateur secondaire');
      // Déterminer le type d'utilisateur connecté
      this.determineUserRoleType(user);

      // Récupérer l'ID de la structure de l'utilisateur connecté
      if (user?.structure_id) {
        this.currentUserStructureId = user.structure_id;
        this.selectedStructureId = user.structure_id;
      }
      if (this.currentUserStructureId && (this.isStructureAdmin || this.isAdminSecondaire)) {
      this.loadMagasins(this.code_structure!);
    }
    });
    this.isGeneralAdmin = this.authService.isGeneralAdmin();
    this.loadData();
    this.iniForm();
    

     // Debounce pour la recherche des utilisateurs
    this.usersSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.usersFilters.search = searchTerm;
      this.usersFilters.page = 1;
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  iniForm(): void {
    // Initialiser structure_id avec la valeur appropriée
    const initialStructureId = this.isGeneralAdmin ? null : this.currentUserStructureId;

    // Initialiser selectedRoleIds à un tableau vide
    this.selectedRoleIds = [];

    this.userForm = this.fb.group(
      {
        nom: ['', [Validators.required, Validators.minLength(2)]],
        telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
        email: ['', [Validators.required, Validators.email]],
        role: [[], Validators.required],
        status: [true, Validators.required],
        password: ['', !this.isEditMode ? [Validators.minLength(6)] : []],
        confirmPassword: [''],
        structure_id: [initialStructureId, this.isGeneralAdmin ? Validators.required : null],
        magasinId: [null],
      },
      { validators: this.customPasswordValidator.bind(this) },
    );
     // Surveiller les changements de rôle pour afficher/masquer le champ magasin
    this.userForm.get('role')?.valueChanges.subscribe((roleIds: number[]) => {
      //console.log('DEBUG - rôle changé:', roleIds);
      this.selectedRoleIds = roleIds || [];
      this.updateMagasinFieldVisibility();
    });
  }

loadStructuresForAdminCreation(): void {
  if (this.isGeneralAdmin && !this.isEditMode) {
    // Vérifier si on est en mode création d'admin
    //const selectedRoles = this.userForm.get('role')?.value || [];
    //const hasAdminRole = selectedRoles.includes(this.adminRoleId);
    
    //if (hasAdminRole) {
      // Charger uniquement les structures sans administrateur
      this.structureService.getStructuresWithoutAdmin()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (structures) => {
            this.structuresWithoutAdmin = structures;
          },
          error: (err) => {
            console.error('Erreur chargement structures sans admin', err);
            this.structuresWithoutAdmin = [];
          }
        });
    /* } else {
      // Pour les autres rôles, charger toutes les structures
      this.structuresWithoutAdmin = this.structures;
    } */
  }
}
// Nouvelle méthode pour déterminer le type d'utilisateur
determineUserRoleType(user:User): void {
  //const user = this.authService.currentUser;
  if (!user) return;

  const userRoles = user.roles?.map(r => r.nom) || [];
  
  if (userRoles.includes('Administrateur Général')) {
    this.userRoleType = 'general_admin';
  } else if (userRoles.includes('Administrateur')) {
    this.userRoleType = 'structure_admin';
  } else if (userRoles.includes('Administrateur secondaire')) {
    this.userRoleType = 'secondary_admin';
  } else {
    this.userRoleType = 'other';
  }
}

// Méthode pour basculer la visibilité d'un champ spécifique
togglePasswordVisibility(field: 'password' | 'confirm'): void {
  if (field === 'password') {
    this.showPassword = !this.showPassword;
  } else {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}

// Méthode pour basculer la visibilité des deux champs
toggleAllPasswordsVisibility(event: any): void {
  const isChecked = event.target.checked;
  this.showPassword = isChecked;
  this.showConfirmPassword = isChecked;
}

get userRoles(): number[] {
    const roles = this.userForm?.get('role')?.value;
    return Array.isArray(roles) ? roles : [];
}
  // Validateur personnalisé qui gère à la fois création et édition
customPasswordValidator(form: FormGroup) {
  const isEditMode = this.isEditMode;
  const password = form.get('password')?.value;
  const confirmPassword = form.get('confirmPassword')?.value;

  // En mode création
  if (!isEditMode) {
    // Les deux champs sont requis
    if (!password || !confirmPassword) {
      return { required: 'Les deux champs de mot de passe sont requis' };
    }
    
    // Longueur minimale
    if (password.length < 6) {
      return { minlength: 'Le mot de passe doit contenir au moins 6 caractères' };
    }
    
    // Correspondance
    if (password !== confirmPassword) {
      return { mismatch: 'Les mots de passe ne correspondent pas' };
    }
  }
  
  // En mode édition
  if (isEditMode) {
    // Si un des deux champs est rempli, l'autre doit l'être aussi
    if ((password && !confirmPassword) || (!password && confirmPassword)) {
      return { mismatch: 'Les deux champs de mot de passe doivent être remplis' };
    }
    
    // Si les deux sont remplis
    if (password && confirmPassword) {
      // Longueur minimale
      if (password.length < 6) {
        return { minlength: 'Le mot de passe doit contenir au moins 6 caractères' };
      }
      
      // Correspondance
      if (password !== confirmPassword) {
        return { mismatch: 'Les mots de passe ne correspondent pas' };
      }
    }
  }
  
  return null; // Tout est OK
}

 // Méthode pour mettre à jour la visibilité du champ magasin
 /* updateMagasinFieldVisibility(): void {

    const selectedRoles = this.selectedRoleIds || [];
    const otherRoles = this.otherRoles || [];
    const adminRoleId = this.adminRoleId || 0;
    const hasAdminRole = this.selectedRoleIds.includes(this.adminRoleId);
    const hasOtherRole = this.selectedRoleIds.some(id => this.otherRoles.includes(id));

    
    if (this.isGeneralAdmin) {
      // Admin général : afficher magasin seulement pour les rôles non-admin
      this.showMagasinField = hasOtherRole && !hasAdminRole;
    } 
    else if (this.isStructureAdmin || this.isAdminSecondaire ) {
      // Admin de structure : afficher magasin pour tous sauf les admins
      this.showMagasinField = !hasAdminRole;
    } 
    else {
      // Autres utilisateurs : ne pas afficher
      this.showMagasinField = false;
    }
    
    // Si le champ n'est pas visible, réinitialiser sa valeur
    if (!this.showMagasinField) {
      this.userForm.patchValue({ magasinId: null });
    }
    
  } */
 updateMagasinFieldVisibility(): void {
    const selectedRoles = this.selectedRoleIds || [];
    const hasAdminRole = this.selectedRoleIds.includes(this.adminRoleId);
    const hasSecondaryAdminRole = this.selectedRoleIds.includes(this.secondaryAdminRoleId);
    const hasOtherRole = this.selectedRoleIds.some(id => this.otherRoles.includes(id));

    
    if (this.isGeneralAdmin) {
      // Admin général : magasin pour les rôles non-admin uniquement
      // Les administrateurs secondaires n'ont pas de magasin
      this.showMagasinField = hasOtherRole && !hasAdminRole && !hasSecondaryAdminRole;
    } 
    else if (this.isStructureAdmin) {
      // Admin de structure : magasin pour les non-admins uniquement
      // Les administrateurs secondaires n'ont pas de magasin
      this.showMagasinField = !hasAdminRole && !hasSecondaryAdminRole;
    } 
    else if (this.isAdminSecondaire) {
      // Admin secondaire : magasin pour les rôles non-admin uniquement (Gérant, Caissier, Employé)
      // Les administrateurs secondaires n'ont pas de magasin
      this.showMagasinField = hasOtherRole && !hasAdminRole && !hasSecondaryAdminRole;
    }
    else {
      // Autres utilisateurs : pas de champ magasin
      this.showMagasinField = false;
    }
    
    // Si le champ n'est pas visible, réinitialiser sa valeur
    if (!this.showMagasinField) {
      this.userForm.patchValue({ magasinId: null });
    }
    
  }


  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    // Si les deux champs sont vides en mode édition, on ne valide pas
    if (this.isEditMode && !password && !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { mismatch: true };
  }

   // Méthode pour charger les magasins
  loadMagasins(structureId: string): void {
    if (!structureId) {
      this.magasins = [];
      return;
    }
    this.isLoading = true;
    this.magasinService.getMagasinsByStructure(structureId)
      .pipe(takeUntil(this.destroy$)
      , finalize(() => this.isLoading = false))
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
          if (magasins.length === 0) {
            // Désactiver le champ si pas de magasins
            this.userForm.get('magasinId')?.disable();
          } 
          else {
            // Activer le champ s'il y a des magasins
            this.userForm.get('magasinId')?.enable();
          }
          //console.log('Magasins chargés:', magasins);
          const selectedMagasinId = this.userForm.get('magasinId')?.value;
          if (selectedMagasinId && !magasins.some(m => m.id === selectedMagasinId)) {
            this.userForm.patchValue({ magasinId: null });
            //console.log('DEBUG - Magasin sélectionné non disponible, réinitialisé');
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des magasins', err);
          this.magasins = [];
        }
      });
  }

  onRoleChange(event: any, roleId: number): void {
    // Empêcher la modification si désactivé
    if (!this.isGeneralAdmin && roleId === this.adminRoleId) {
      event.preventDefault();
      return;
    }
    const isChecked = (event.target as HTMLInputElement).checked;
    const role = this.userForm.get('role')?.value || [];


    if (isChecked) {
      this.userForm.get('role')?.setValue([...role, roleId]);
    } else {
      this.userForm.get('role')?.setValue(role.filter((id: number) => id !== roleId));
    }

    // Mettre à jour la visibilité du champ magasin
    setTimeout(() => {
      this.selectedRoleIds = this.userForm.get('role')?.value || [];
      this.updateMagasinFieldVisibility();

      // Recharger les structures disponibles si le rôle Administrateur est sélectionné
      if (this.isGeneralAdmin && this.selectedRoleIds.includes(this.adminRoleId)) {
        this.loadStructuresForAdminCreation();
      } else if (this.isGeneralAdmin) {
        // Sinon, utiliser toutes les structures
        this.structuresWithoutAdmin = this.structures;
      }
    }, 0);

    
   
  }
  
/* loadData(): void {
    this.isLoading = true;

    const filters: UsersFilter = {
      page: this.usersFilters.page,
      limit: this.usersItemsPerPage,
      search: this.usersFilters.search || undefined,
      statut: this.usersFilters.statut
    };

    const usersObservable = this.isGeneralAdmin 
      ? this.userService.getAllsBis(filters)
      : (this.code_structure 
          ? this.userService.getByStructureBis(this.code_structure, filters)
          : of({ items: [], pagination: { total: 0, page: 1, totalPages: 1, limit: 10, hasNext: false, hasPrev: false } }));

    forkJoin({
      users: usersObservable,
      roles: this.roleService.getAllRoles(),
      structures: this.isGeneralAdmin 
          ? this.structureService.getAll() 
          : (this.currentUserStructureId 
              ? this.structureService.getByCodeStructure(this.code_structure!).pipe(
                  map(structure => structure ? [structure] : [])
                )
              : of([]))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ({ users, roles, structures }) => {
          // users contient maintenant { items, pagination }
          this.users = users.items;
          
          // Mise à jour de la pagination
          this.usersTotalItems = users.pagination.total;
          this.usersCurrentPage = users.pagination.page;
          this.usersTotalPages = users.pagination.totalPages;
          this.usersHasNext = users.pagination.hasNext;
          this.usersHasPrev = users.pagination.hasPrev;

         // Filtrer les rôles selon le type d'utilisateur connecté
          this.roles = this.filterRolesByUserType(roles);
          this.structures = structures;
          this.userStructures = structures;

          // Identifier les IDs de rôle
          const adminRole = this.roles.find(r =>
            r.nom === 'Administrateur' && r.id !== undefined
          );
          
          const secondaryAdminRole = this.roles.find(r =>
            r.nom === 'Administrateur secondaire' && r.id !== undefined
          );

          const otherRoleNames = ['Gérant', 'Caissier', 'Employé'];

          const otherRoles = this.roles.filter(r =>
            otherRoleNames.some(name => r.nom === name) && r.id !== undefined
          );

          if (adminRole?.id !== undefined) {
            this.adminRoleId = adminRole.id;
          }
          
          if (secondaryAdminRole?.id !== undefined) {
            this.secondaryAdminRoleId = secondaryAdminRole.id;
          }

          this.otherRoles = otherRoles
            .map(r => r.id)
            .filter((id): id is number => id !== undefined);

          // Filtrer les utilisateurs affichés selon le type d'utilisateur connecté
          if (this.userRoleType === 'secondary_admin') {
            this.users = this.users.filter(user => 
              !user.roles?.some(r => r.nom === 'Administrateur')
            );
          }

          // Mapping rôles utilisateurs
          for (const user of this.users) {
            this.userRolesMap[user.id] =
              user.roles?.map(role => role.nom) || [];
          }
        },
        error: err => {
          console.error('Erreur chargement données', err);
        }
      });
  } */

  loadData(): void {
  this.isLoading = true;

  const filters: UsersFilter = {
    page: this.usersFilters.page,
    limit: this.usersItemsPerPage,
    search: this.usersFilters.search || undefined,
    statut: this.usersFilters.statut
  };

  const usersObservable = this.isGeneralAdmin 
    ? this.userService.getAllsBis(filters)
    : (this.code_structure 
        ? this.userService.getByStructureBis(this.code_structure, filters)
        : of({ items: [], pagination: { total: 0, page: 1, totalPages: 1, limit: 10, hasNext: false, hasPrev: false } }));

  // Récupération des structures
  let structuresObservable: Observable<Structure[]>;
  
  if (this.isGeneralAdmin) {
    // Admin général : récupère toutes les structures
    structuresObservable = this.structureService.getAll().pipe(
      map((response: any) => {
        // Vérifier si la réponse a la structure { items: [...] } ou est directement un tableau
        if (response && Array.isArray(response.items)) {
          return response.items;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  } else {
    // Non-admin : récupère uniquement sa structure
    structuresObservable = this.currentUserStructureId 
      ? this.structureService.getById(this.currentUserStructureId).pipe(
          map(structure => structure ? [structure] : [])
        )
      : of([]);
  }

  forkJoin({
    users: usersObservable,
    roles: this.roleService.getAllRoles(),
    structures: structuresObservable
  })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => (this.isLoading = false))
    )
    .subscribe({
      next: ({ users, roles, structures }) => {
        // Vérifier que users est un tableau
        this.users = Array.isArray(users) ? users : (users.items || []);
        
        // Vérifier que structures est un tableau
        this.structures = Array.isArray(structures) ? structures : [];

        
        // Mise à jour de la pagination si users a une propriété pagination
        if (users.pagination) {
          this.usersTotalItems = users.pagination.total;
          this.usersCurrentPage = users.pagination.page;
          this.usersTotalPages = users.pagination.totalPages;
          this.usersHasNext = users.pagination.hasNext;
          this.usersHasPrev = users.pagination.hasPrev;
        } else {
          // Fallback si pas de pagination
          this.usersTotalItems = this.users.length;
          this.usersTotalPages = Math.ceil(this.users.length / this.usersItemsPerPage);
          this.usersHasNext = this.usersCurrentPage < this.usersTotalPages;
          this.usersHasPrev = this.usersCurrentPage > 1;
        }

        // Filtrer les rôles selon le type d'utilisateur connecté
        this.roles = this.filterRolesByUserType(roles);
        this.userStructures = this.structures;

        // Identifier les IDs de rôle
        const adminRole = this.roles.find(r =>
          r.nom === 'Administrateur' && r.id !== undefined
        );
        
        const secondaryAdminRole = this.roles.find(r =>
          r.nom === 'Administrateur secondaire' && r.id !== undefined
        );

        const otherRoleNames = ['Gérant', 'Caissier', 'Employé'];
        const otherRoles = this.roles.filter(r =>
          otherRoleNames.some(name => r.nom === name) && r.id !== undefined
        );

        if (adminRole?.id !== undefined) {
          this.adminRoleId = adminRole.id;
        }
        
        if (secondaryAdminRole?.id !== undefined) {
          this.secondaryAdminRoleId = secondaryAdminRole.id;
        }

        this.otherRoles = otherRoles
          .map(r => r.id)
          .filter((id): id is number => id !== undefined);

        // Filtrer les utilisateurs affichés selon le type d'utilisateur connecté
        if (this.userRoleType === 'secondary_admin') {
          this.users = this.users.filter(user => 
            !user.roles?.some(r => r.nom === 'Administrateur')
          );
        }

        // Mapping rôles utilisateurs
        for (const user of this.users) {
          this.userRolesMap[user.id] = user.roles?.map(role => role.nom) || [];
        }
        

        if(this.isGeneralAdmin){
        this.loadStructuresForAdminCreation();
      }
      },
      error: err => {
        console.error('Erreur chargement données', err);
      }
    });
}
  // Nouvelle méthode pour filtrer les rôles selon le type d'utilisateur
  filterRolesByUserType(roles: Role[]): Role[] {
    let filteredRoles = [...roles];
    
    switch (this.userRoleType) {
      case 'general_admin':
        // Admin général : ne voit que "Administrateur" et coche par défaut
        filteredRoles = roles.filter(r => r.nom === 'Administrateur');
        // Définir le rôle Administrateur comme sélectionné par défaut dans le formulaire
        setTimeout(() => {
          const adminRole = filteredRoles.find(r => r.nom === 'Administrateur');
          if (adminRole?.id) {
            this.userForm.patchValue({ role: [adminRole.id] });
            this.selectedRoleIds = [adminRole.id];
            this.updateMagasinFieldVisibility();
          }
        }, 100);
        break;
        
      case 'structure_admin':
        // Admin de structure : voit tous les rôles sauf "Administrateur"
        filteredRoles = roles.filter(r => 
          r.nom !== 'Administrateur' && r.nom !== 'Administrateur Général'
        );
        break;
        
      case 'secondary_admin':
        // Admin secondaire : voit tous les rôles sauf "Administrateur" et "Administrateur secondaire"
        filteredRoles = roles.filter(r => 
          r.nom !== 'Administrateur' && 
          r.nom !== 'Administrateur secondaire' && 
          r.nom !== 'Administrateur Général'
        );
        break;
        
      default:
        // Autres utilisateurs : ne voient aucun rôle (ne peuvent pas créer d'utilisateurs)
        filteredRoles = [];
        break;
    }
    
    return filteredRoles;
  }

  // Gestionnaires pour les utilisateurs
  onUsersPageChange(page: number): void {
    if (page >= 1 && page <= this.usersTotalPages) {
      this.usersFilters.page = page;
      this.loadData();
    }
  }

  onUsersSearchChange(searchTerm: string): void {
    this.usersSearchSubject.next(searchTerm);
  }

  onUsersRowsPerPageChange(limit: number): void {
    this.usersItemsPerPage = limit;
    this.usersFilters.limit = limit;
    this.usersFilters.page = 1;
    this.loadData();
  }

  onUsersStatutChange(statut: string): void {
    this.usersFilters.statut = statut;
    this.usersFilters.page = 1;
    this.loadData();
  }

  resetUsersFilters(): void {
    this.usersFilters = {
      page: 1,
      limit: this.usersItemsPerPage,
      search: '',
      statut: 'tous'
    };
    this.loadData();
  }

  openModal(content: any, user?: User): void {

    // Vérifier que content est défini
    if (!content) {
      console.error('Référence modal non trouvée');
      return;
    }
  
    if (user && !user.status) {
      this.toastr.warning('Cet utilisateur est inactif. Veuillez d\'abord l\'activer.');
      return;
    }
  

    // Vérifier si l'utilisateur a le rôle "Administrateur secondaire"
    const hasSecondaryAdminRole = user?.roles?.some(role => 
      role.nom === 'Administrateur secondaire' || role.id === this.secondaryAdminRoleId
    ) || false;

    if(this.isAdminSecondaire && hasSecondaryAdminRole){
      this.toastr.warning('Vous n\'êtes pas autorisé à modifier cet utilisateur');
      return;
    }

    this.selectedUser = user || null;
    this.isEditMode = !!user;
    this.errorMessage = ''; // Réinitialiser les erreurs
    this.showPassword = false;
    this.showConfirmPassword = false;

    this.userForm.reset();
    this.selectedRoleIds = [];

    // Réinitialiser le formulaire
    this.iniForm(); // Toujours réinitialiser pour éviter les conflits

    // Appliquer la sélection par défaut des rôles pour l'admin général
    /* if (this.userRoleType === 'general_admin' && !this.isEditMode) {
      const adminRole = this.roles.find(r => r.nom === 'Administrateur');
      if (adminRole?.id) {
        this.userForm.patchValue({ role: [adminRole.id] });
        this.selectedRoleIds = [adminRole.id];
        this.updateMagasinFieldVisibility();
      }
    } */

    // Appliquer la sélection par défaut des rôles pour l'admin général
    if (this.userRoleType === 'general_admin' && !this.isEditMode) {
      const adminRole = this.roles.find(r => r.nom === 'Administrateur');
      if (adminRole?.id) {
        // Utiliser setTimeout pour éviter les conflits de détection de changements
        setTimeout(() => {
          this.userForm.patchValue({ 
            role: [adminRole.id],
            status: true 
          });
          this.selectedRoleIds = [adminRole.id!];
          this.updateMagasinFieldVisibility();
        }, 0);
      }
    } else if (!this.isEditMode) {
      // Pour les autres types d'utilisateurs, status actif par défaut
      setTimeout(() => {
        this.userForm.patchValue({ status: true });
      }, 0);
    }

    // Initialisation du formulaire
    if (this.isEditMode && user) {
      // Récupère les rôles de l'utilisateur
      this.roleService.getRolesIdByUser(user.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userRole) => {
          // Récupère les détails complets de l'utilisateur
          this.userService.getById(user.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fullUser) => {
              // Pour un admin général, on garde la structure de l'utilisateur
              // Pour un non-admin, on force la structure de l'utilisateur connecté
              const structureId = this.isGeneralAdmin 
                ? fullUser.structure_id 
                : this.currentUserStructureId;

              /* if (structureId && !this.isGeneralAdmin) {
                  this.loadMagasins(this.code_structure!);
                } */
              // Patch le formulaire avec toutes les données SANS le mot de passe
              const userData = {
                nom: fullUser.nom,
                telephone: fullUser.telephone,
                email: fullUser.email,
                status: fullUser.status,
                structure_id: structureId,
                magasinId:fullUser.magasinId,
                role: userRole.roleIds || [],
                password: '', // On laisse vide
                confirmPassword: '' // On laisse vide
              };

              this.userForm.patchValue(userData);
              this.updateMagasinFieldVisibility();
              // Ouvrir le modal maintenant que les données sont chargées
              this.modalService.open(content, { size: 'lg' });
            },
            error: (err) => {
              console.error('Erreur lors du chargement des détails utilisateur', err);
              // Pour un admin général, on garde la structure de l'utilisateur
              // Pour un non-admin, on force la structure de l'utilisateur connecté
              const structureId = this.isGeneralAdmin 
                ? user.structure_id 
                : this.currentUserStructureId;
              // Fallback si erreur
              const fallbackData = {
                nom: user.nom,
                telephone: user.telephone,
                email: user.email,
                status: user.status,
                structure_id: structureId,
                magasinId:user.magasinId,
                role: userRole.roleIds || [],
                password: '',
                confirmPassword: ''
              };
              this.userForm.patchValue(fallbackData);
              this.updateMagasinFieldVisibility();
              this.modalService.open(content, { size: 'lg' });
            },
          });
        },
        error: (err) => {
          console.error('Erreur lors du chargement des rôles', err);
          // Pour un admin général, on garde la structure de l'utilisateur
          // Pour un non-admin, on force la structure de l'utilisateur connecté
          const structureId = this.isGeneralAdmin 
            ? user.structure_id 
            : this.currentUserStructureId;
          // Fallback si erreur de chargement des rôles
          const fallbackData = {
            nom: user.nom,
            telephone: user.telephone,
            email: user.email,
            status: user.status,
            magasinId:user.magasinId,
            structure_id: structureId,
            role: [],
            password: '',
            confirmPassword: ''
          };
          this.userForm.patchValue(fallbackData);
          this.updateMagasinFieldVisibility();
          this.modalService.open(content, { size: 'lg' });
        },
      });
    } else {
      // Mode création - formulaire vide
      //console.log('DEBUG - Mode création');
      // On peut pré-remplir la structure si l'utilisateur n'est pas admin général
      // Pré-remplir la structure selon le type d'utilisateur
        if (!this.isGeneralAdmin) {
          // Pour un non-admin, assigner automatiquement sa structure
          const structureId = this.currentUserStructureId;
          //console.log('DEBUG - Structure ID pour non-admin:', structureId);
          this.userForm.patchValue({ structure_id: structureId });

          // Charger les magasins de la structure
          /* if (structureId) {
            this.loadMagasins(this.code_structure!);
          } */
          
          // Récupérer le nom de la structure pour l'affichage
          if (structureId && this.structures.length > 0) {
            const structure = this.structures.find(s => s.id === structureId);
            if (structure) {
              this.selectedStructureId = structureId;
            }
          }

          // Mettre à jour la visibilité du champ magasin
          this.updateMagasinFieldVisibility();
        }
      
      this.modalService.open(content, { size: 'lg' });
    }
}

onSubmit(): void {

  if (!this.canCreateUser()) {
    this.errorMessage = 'Vous n\'avez pas la permission de créer un utilisateur.';
    return;
  }
  // Réinitialiser le message d'erreur
  this.errorMessage = '';

  // Forcer la validation du formulaire
  this.markFormGroupTouched(this.userForm);
   
  // Valider spécifiquement le mot de passe
  const passwordValidation:any = this.customPasswordValidator(this.userForm);
  if (passwordValidation) {
    // Afficher l'erreur spécifique au mot de passe
    const errorKey = Object.keys(passwordValidation)[0];
    this.errorMessage = passwordValidation[errorKey];
    return;
  }

  if (this.userForm.invalid) {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    this.markFormGroupTouched(this.userForm);
    this.toastr.error('Le formulaire est invalide')
    return;
  }

  const userData = {
    ...this.userForm.value,
    //code_structure: this.code_structure ||null,
  };
     // Gestion de la structure selon le type d'utilisateur
    if (!this.isGeneralAdmin) {
      // Pour un non-admin, forcer la structure de l'utilisateur connecté
      userData.structure_id = this.currentUserStructureId;
      
      // Récupérer le code_structure depuis la structure sélectionnée
      if (userData.structure_id && this.structures.length > 0) {
        const selectedStructure = this.structures.find(s => Number(s.id )=== Number(userData.structure_id));
        if (selectedStructure && selectedStructure.code_structure) {
          userData.code_structure = selectedStructure.code_structure;
        }
      }
    } else {
      // Pour un admin général, s'assurer qu'une structure est sélectionnée
      if (!userData.structure_id) {
        this.errorMessage = 'Veuillez sélectionner une structure';
        return;
      }
    
    // Récupérer le code_structure depuis la structure sélectionnée
    const selectedStr = this.structures.find(s => Number(s.id )=== Number(userData.structure_id));
    if (selectedStr && selectedStr.code_structure) {
      userData.code_structure = selectedStr.code_structure;
    } else {
      this.errorMessage = 'Code structure non trouvé pour la structure sélectionnée';
      return;
    }
  }
   // Validation du magasin selon les règles
    const hasAdminRole = this.selectedRoleIds.includes(this.adminRoleId);
    const hasSecondaryAdminRole = this.selectedRoleIds.includes(this.secondaryAdminRoleId);
    const hasOtherRole = this.selectedRoleIds.some(id => this.otherRoles.includes(id));


    if (hasSecondaryAdminRole) {
      userData.magasinId = null;
      // Si l'utilisateur a aussi d'autres rôles, on garde seulement admin secondaire ?
      // Vous pouvez décider de la logique ici
    }
    if (this.isGeneralAdmin) {
      // Admin général : magasin obligatoire pour les rôles non-admin
      if (hasOtherRole && !hasAdminRole && !hasSecondaryAdminRole && !userData.magasinId) {
        this.errorMessage = 'Veuillez sélectionner un magasin pour ce type de rôle';
        return;
      }
      // Admin général : pas de magasin pour les admins
      if (hasAdminRole || hasSecondaryAdminRole) {
        userData.magasinId = null;
      }
    } 
    else if (this.isStructureAdmin) {
      // Admin de structure : magasin obligatoire pour les non-admins
      if (!hasAdminRole && !hasSecondaryAdminRole && !userData.magasinId) {
        this.errorMessage = 'Veuillez sélectionner un magasin pour ce type de rôle';
        return;
      }
      // Admin de structure : pas de magasin pour les admins
      if (hasAdminRole) {
        userData.magasinId = null;
      }
  }
  
  // Supprimer toujours le champ de confirmation
  delete userData.confirmPassword;


  // Extraire les rôles sélectionnés
  const roleIds = userData.role || [];
  delete userData.role; // Supprimer les rôles des données utilisateur

  if (this.isEditMode && this.selectedUser) {
    // Mise à jour de l'utilisateur
    if (!userData.password) {
      delete userData.password;
    }
    this.userService.update(this.selectedUser.id, userData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedUser) => {
        // Mise à jour des rôles de l'utilisateur
        this.roleService.updateRolesForUser(updatedUser.id, roleIds)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Utilisateur mis à jour avec succès');
            this.loadData();
            this.closeModal();
            //this.modalService.dismissAll();
            //this.userForm.reset(); // Réinitialiser le formulaire
          },
          error: (err) => {
            console.error('Erreur lors de la mise à jour des rôles', err);
            this.toastr.error('Erreur lors de la mise à jour des rôles');
            // On ne ferme pas le modal en cas d'erreur sur les rôles
          },
        });
      },
      error: (err) => {
        console.error("Erreur lors de la mise à jour de l'utilisateur", err);
        this.toastr.error(err.error?.message);
        this.errorMessage =
          err.error?.message || "Erreur lors de la mise à jour de l'utilisateur";
      },
    });
  } else {
    // Création d'un nouvel utilisateur - le mot de passe est requis
    if (!userData.password) {
      this.toastr.error('Le mot de passe est requis pour la création');
      return;
    }
    
    this.userService.create(userData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (newUser) => {
        // Assignation des rôles au nouvel utilisateur
        if (roleIds.length > 0) {
          this.roleService.assignRolesToUser(newUser.id, roleIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Utilisateur créé avec succès');
              this.loadData();
              this.closeModal();
              //this.modalService.dismissAll();
              //this.userForm.reset(); // Réinitialiser le formulaire
            },
            error: (err) => {
              console.error("Erreur lors de l'assignation des rôles", err);
              this.toastr.error('Erreur lors de l\'assignation des rôles');
              // On peut quand même fermer le modal car l'utilisateur est créé
              this.loadData();
              this.closeModal();
              //this.modalService.dismissAll();
              //this.userForm.reset();
            },
          });
        } else {
          this.toastr.success('Utilisateur créé avec succès');
          this.loadData();
          this.closeModal();
          //this.modalService.dismissAll();
          //this.userForm.reset();
        }
      },
      error: (err) => {
        console.error("Erreur lors de la création de l'utilisateur", err);
        this.toastr.error(err.error?.message);
        this.errorMessage = err.error?.message || "Erreur lors de la création de l'utilisateur";
      },
    });
  }
}

// Nouvelle méthode pour fermer proprement le modal
closeModal(): void {
  // Réinitialiser complètement le formulaire
  this.userForm.reset();
  this.isEditMode = false;
  this.selectedUser = null;
  this.selectedRoleIds = [];
  this.errorMessage = '';
  this.showPassword = false;
  this.showConfirmPassword = false;
  
  // Réinitialiser les valeurs par défaut selon le type d'utilisateur
  if (this.userRoleType === 'general_admin') {
    const adminRole = this.roles.find(r => r.nom === 'Administrateur');
    if (adminRole?.id) {
      setTimeout(() => {
        this.userForm.patchValue({ 
          role: [adminRole.id],
          status: true 
        });
        this.selectedRoleIds = [adminRole.id!];
      }, 100);
    }
  } else {
    this.userForm.patchValue({ status: true });
  }
  
  // Fermer tous les modals
  this.modalService.dismissAll();
}
// Méthode pour obtenir le nom du magasin
getNomMagasin(magasinId: number | string | null | undefined): string {
  if (magasinId === null || magasinId === undefined) {
    //console.log('DEBUG - magasinId est null ou undefined');
    return 'Non assigné'
  };
  if (!this.magasins?.length) {
    //console.log('DEBUG - Pas de magasins chargés');
    return 'Non assigné'
  };

  const id = Number(magasinId); // 🔥 conversion
  const magasin = this.magasins.find(m => Number(m.id) === id);

  return magasin?.nom ?? 'Non assigné';
}


  // Modifiez la méthode canCreateUser
canCreateUser(): boolean {
  // Seul l'admin général peut créer un admin de structure
  const selectedRoleIds = this.userForm?.get('role')?.value || [];
  const hasAdminRole = selectedRoleIds.includes(this.adminRoleId);
  const hasSecondaryAdminRole = selectedRoleIds.includes(this.secondaryAdminRoleId);
  
  if (hasAdminRole && this.userRoleType !== 'general_admin') {
    this.errorMessage = 'Seul l\'administrateur général peut créer un administrateur de structure';
    return false;
  }
  
  if (hasSecondaryAdminRole && !['general_admin', 'structure_admin'].includes(this.userRoleType)) {
    this.errorMessage = 'Vous n\'avez pas la permission de créer un administrateur secondaire';
    return false;
  }
  
  // Vérifier si l'utilisateur a le droit de créer des utilisateurs
  if (!['general_admin', 'structure_admin', 'secondary_admin'].includes(this.userRoleType)) {
    this.errorMessage = 'Vous n\'avez pas la permission de créer des utilisateurs';
    return false;
  }
  
  return true;
}

// Méthode utilitaire pour marquer tous les champs comme touchés
private markFormGroupTouched(formGroup: FormGroup) {
  Object.values(formGroup.controls).forEach(control => {
    control.markAsTouched();
    
    if (control instanceof FormGroup) {
      this.markFormGroupTouched(control);
    }
  });
}

// Méthode pour obtenir le nom de la structure sélectionnée
  getSelectedStructureName(): string {
    if (!this.selectedStructureId || this.structures.length === 0) return '';
    const structure = this.structures.find(s => s.id === this.selectedStructureId);
    return structure ? structure.nom_structure : '';
  }

  deleteUser(userId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.isLoading = true;

      // D'abord, récupérer les permissions associées au rôle
      this.roleService.getRolesIdByUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userRoles) => {
          const roleIds = userRoles.roleIds || [];

          // Supprimer d'abord les associations de permissions
          if (roleIds.length > 0) {
            //console.log('Succés');
            this.roleService.removeRolesFromUser(userId, roleIds)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                // Puis supprimer le rôle lui-même
                this.deleteUserFinally(userId);
              },
              error: (err) => {
                this.isLoading = false;
                console.error('Erreur lors de la suppression des permissions du rôle', err);
                //this.errorMessage = 'Erreur lors de la suppression des associations de permissions';
              },
            });
          } else {
            // Si pas de permissions, supprimer directement le rôle
            this.deleteUser(userId);
            //console.log('Echec');
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Erreur lors de la récupération des rôles de user', err);
          //this.errorMessage = 'Erreur lors de la récupération des permissions associées';
        },
      });
    }
  }

  private deleteUserFinally(userId: number): void {
    this.userService.delete(userId).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Utilisateur supprimé avec succès');
        this.loadData();
        //this.successMessage = 'Rôle supprimé avec succès';
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur lors de la suppression de user', err);
        this.toastr.error('Erreur lors de la suppression de user : ' + err.error?.message);
        //this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'utilisateur';
        //this.errorMessage = 'Erreur lors de la suppression du rôle';
      },
    });
  }

  /* getNomStructure(id: number): string {
    if (!this.structures) return '';
    const structure = this.structures.find((str) => str.id === id);
    return structure ? structure.nom_structure : '';
  } */
 getNomStructure(id: number): string {
  // Vérifier que structures est un tableau
  if (!this.structures || !Array.isArray(this.structures)) {
    console.warn('structures n\'est pas un tableau:', this.structures);
    return 'Chargement...';
  }
  
  const structure = this.structures.find((str) => str.id === id);
  return structure ? structure.nom_structure : 'Non assigné';
}

  getUserRole(user: User): Observable<string[]> {
    return this.roleService
      .getRolesByUser(user.id)
      .pipe(map((roles: Role[]) => roles.map((role) => role.nom)));
  }

  
  toggleStatus(user: User): void {
  const action = user.status ? 'désactiver' : 'activer';
  
  // Vérifier si l'utilisateur a le rôle "Administrateur secondaire"
  const hasSecondaryAdminRole = user.roles?.some(role => 
    role.nom === 'Administrateur secondaire' || role.id === this.secondaryAdminRoleId
  ) || false;
  
  if (!confirm(`Êtes-vous sûr de vouloir ${action} l'utilisateur ?`)) {
    return;
  }
  
  if(this.isAdminSecondaire && hasSecondaryAdminRole){
    this.toastr.warning(`Vous n'êtes pas autorisé à ${action} cet utilisateur`);
    return;
  }
  const statut = !user.status;
  this.userService.updateStatus(user.id, statut).subscribe(() => {
    this.toastr.success('Status mis à jour avec succès');
    this.loadData();
  });
}

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
  // Méthode pour générer le tableau des pages
  getPagesArray(): number[] {
    return Array.from({ length: this.usersTotalPages }, (_, i) => i + 1);
  }

 }
