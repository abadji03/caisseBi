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
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { Structure } from '../../../modeles/structure.model';
import { AuthService } from '../../../services/auth.service';
import { StructureService } from '../../../services/structure.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize, forkJoin, map, Observable, of, Subject, Subscription, takeUntil } from 'rxjs';
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

  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  //roleIds: number[] = [];

  private destroy$ = new Subject<void>();

  code_structure: string | null = null;
  currentUser: User | null = null;
  
  private userSubscription!: Subscription;

  showStructureField = false;
  userStructures: Structure[] = [];
  currentUserStructureId: number | null = null;
  selectedStructureId: number | null = null;

  magasins: Magasin[] = [];
  showMagasinField = false;
  isStructureAdmin = false;
  selectedRoleIds: number[] = [];
  adminRoleId = 0; // ID du rôle "Administrateur de structure"
  otherRoles:number[] = []; // IDs des autres rôles (Gérant, Caissier, Employé)

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
      this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      console.log('Code structure initialisé :', this.code_structure);
      // Déterminer si on doit montrer le champ structure
      this.showStructureField = this.authService.isGeneralAdmin();
      this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID

      // Récupérer l'ID de la structure de l'utilisateur connecté
      if (user?.structure_id) {
        this.currentUserStructureId = user.structure_id;
        this.selectedStructureId = user.structure_id;
      }
      if (this.currentUserStructureId && this.isStructureAdmin) {
      this.loadMagasins(this.code_structure!);
    }
    });
    this.isGeneralAdmin = this.authService.isGeneralAdmin();
    this.loadData();
    this.iniForm();
    /* this.loadUsers();
    //if (this.authService.isGeneralAdmin()) {
      this.loadStructures();
    //} */
    /* console.log(this.structures.length)
     this.structures.forEach(str=> {
            console.log(str.nom_structure, str.id, str.code_structure)
         }); */
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
      this.selectedRoleIds = roleIds;
      this.updateMagasinFieldVisibility();
    });
  }

/* get userRoles(): number[] {
  return this.userForm?.get('role')?.value || [];
} */
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
 updateMagasinFieldVisibility(): void {

    const selectedRoles = this.selectedRoleIds || [];
    const otherRoles = this.otherRoles || [];
    const adminRoleId = this.adminRoleId || 0;
    const hasAdminRole = this.selectedRoleIds.includes(this.adminRoleId);
    const hasOtherRole = this.selectedRoleIds.some(id => this.otherRoles.includes(id));

    console.log('Debug - updateMagasinFieldVisibility:', {
    hasAdminRole,
    hasOtherRole,
    selectedRoleIds: selectedRoles,
    adminRoleId: adminRoleId,
    otherRoles: otherRoles,
    isGeneralAdmin: this.isGeneralAdmin,
    isStructureAdmin: this.isStructureAdmin
  });
    
    if (this.isGeneralAdmin) {
      // Admin général : afficher magasin seulement pour les rôles non-admin
      this.showMagasinField = hasOtherRole && !hasAdminRole;
    } 
    else if (this.isStructureAdmin) {
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
    
    console.log('Visibilité champ magasin:', {
      showMagasinField: this.showMagasinField,
      selectedRoleIds: selectedRoles,
      isGeneralAdmin: this.isGeneralAdmin,
      isStructureAdmin: this.isStructureAdmin
    });
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

    console.log('DEBUG - onRoleChange:', {
      roleId,
      isChecked,
      currentRoles: role
    });

    if (isChecked) {
      this.userForm.get('role')?.setValue([...role, roleId]);
    } else {
      this.userForm.get('role')?.setValue(role.filter((id: number) => id !== roleId));
    }

    // Mettre à jour la visibilité du champ magasin
    setTimeout(() => {
      this.selectedRoleIds = this.userForm.get('role')?.value || [];
      this.updateMagasinFieldVisibility();
    }, 0);
   
  }
  
  loadData(): void {
  this.isLoading = true;

  forkJoin({
    users: this.userService.getAlls(),          // 🔥 filtré côté backend
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
        this.users = users;
        this.roles = roles.filter(r => r.id !== 1);
        this.structures = structures;
        this.userStructures = structures; // Garder une copie pour l'affichage

        // Identifier les IDs de rôle
        const adminRole = this.roles.find(r =>
          r.nom.toLowerCase().includes('administrateur') && r.id !== undefined
        );

        const otherRoleNames = ['gérant', 'caissier', 'employé'];

        const otherRoles = this.roles.filter(r =>
          otherRoleNames.some(name => r.nom.toLowerCase().includes(name)) && r.id !== undefined
        );

        if (adminRole?.id !== undefined) {
          this.adminRoleId = adminRole.id;
        }

        this.otherRoles = otherRoles
          .map(r => r.id)
          .filter((id): id is number => id !== undefined);

        // Si l'utilisateur n'est pas admin général, filtrer les utilisateurs par sa structure
        if (!this.isGeneralAdmin && this.currentUserStructureId) {
            this.users = this.users.filter(user => 
              user.structure_id === this.currentUserStructureId || !user.structure_id
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
}


  openModal(content: any, user?: User): void {
  
  console.log('DEBUG - openModal appelé', {
    user,
    isEditMode: !!user,
    isGeneralAdmin: this.isGeneralAdmin,
    isStructureAdmin: this.isStructureAdmin,
    currentUserStructureId: this.currentUserStructureId
  });
  this.selectedUser = user || null;
  this.isEditMode = !!user;
  this.errorMessage = ''; // Réinitialiser les erreurs

  // Réinitialiser le formulaire
  this.iniForm(); // Toujours réinitialiser pour éviter les conflits

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
          console.log('DEBUG - Chargement magasins avec code_structure:', this.code_structure);
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
    console.log('Le formulaire est invalide');
    return;
  }

  const userData = {
    ...this.userForm.value,
    code_structure: this.code_structure ||null,
  };

    // Gestion de la structure selon le type d'utilisateur
    if (!this.isGeneralAdmin) {
      // Pour un non-admin, forcer la structure de l'utilisateur connecté
      userData.structure_id = this.currentUserStructureId;
    } else {
      // Pour un admin général, s'assurer qu'une structure est sélectionnée
      if (!userData.structure_id) {
        this.errorMessage = 'Veuillez sélectionner une structure';
        return;
      }
    }
   // Validation du magasin selon les règles
    const hasAdminRole = this.selectedRoleIds.includes(this.adminRoleId);
    const hasOtherRole = this.selectedRoleIds.some(id => this.otherRoles.includes(id));

    console.log('Debug - Validation magasin:', {
      hasAdminRole,
      hasOtherRole,
      selectedRoleIds: this.selectedRoleIds,
      magasinId: userData.magasinId,
      userData
    });

    if (this.isGeneralAdmin) {
      // Admin général : magasin obligatoire pour les rôles non-admin
      if (hasOtherRole && !hasAdminRole && !userData.magasinId) {
        this.errorMessage = 'Veuillez sélectionner un magasin pour ce type de rôle';
        return;
      }
      // Admin général : pas de magasin pour les admins
      if (hasAdminRole) {
        userData.magasinId = null;
      }
    } 
    else if (this.isStructureAdmin) {
      // Admin de structure : magasin obligatoire pour les non-admins
      if (!hasAdminRole && !userData.magasinId) {
        this.errorMessage = 'Veuillez sélectionner un magasin pour ce type de rôle';
        return;
      }
      // Admin de structure : pas de magasin pour les admins
      if (hasAdminRole) {
        userData.magasinId = null;
      }
  }

  // Ne pas envoyer les champs de mot de passe s'ils sont vides en mode édition
  /* if (this.isEditMode) {
    // Si les deux champs de mot de passe sont vides, on les supprime complètement
    if (!userData.password && !userData.confirmPassword) {
      delete userData.password;
      delete userData.confirmPassword;
    }
    // Si seulement un des deux est rempli, on ne fait rien et on laisse le validateur gérer
  } */
  
  // Supprimer toujours le champ de confirmation
  delete userData.confirmPassword;

  console.log('Données utilisateur',userData);

  // Extraire les rôles sélectionnés
  const roleIds = userData.role || [];
  delete userData.role; // Supprimer les rôles des données utilisateur

  if (this.isEditMode && this.selectedUser) {
    // Mise à jour de l'utilisateur
    if (!userData.password) {
      delete userData.password;
    }
    console.log('Données envoyées au backend:', {
      userData,
      hasPassword: !!userData.password,
      isEditMode: this.isEditMode,
      passwordValue: userData.password
    });
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
            this.modalService.dismissAll();
            this.userForm.reset(); // Réinitialiser le formulaire
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
              this.modalService.dismissAll();
              this.userForm.reset(); // Réinitialiser le formulaire
            },
            error: (err) => {
              console.error("Erreur lors de l'assignation des rôles", err);
              this.toastr.error('Erreur lors de l\'assignation des rôles');
              // On peut quand même fermer le modal car l'utilisateur est créé
              this.loadData();
              this.modalService.dismissAll();
              this.userForm.reset();
            },
          });
        } else {
          this.toastr.success('Utilisateur créé avec succès');
          this.loadData();
          this.modalService.dismissAll();
          this.userForm.reset();
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

// Surveiller les changements de structure pour charger les magasins
  /* onStructureChange(): void {
    const structureId = this.userForm.get('structure_id')?.value;
    
    if (structureId && this.isGeneralAdmin) {
      this.loadMagasins(this.code_structure!);
    }
  } */
 canCreateUser(): boolean {
    // Seul l'admin général peut créer un admin de structure
    const selectedRoleIds = this.userForm?.get('role')?.value || [];
    const hasAdminRole = selectedRoleIds.includes(this.adminRoleId);
    
    if (hasAdminRole && !this.isGeneralAdmin) {
      this.errorMessage = 'Seul l\'administrateur général peut créer un administrateur de structure';
      return false;
    }
    
    // L'admin de structure peut créer d'autres utilisateurs
    if (!this.isGeneralAdmin && !this.isStructureAdmin) {
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

  getNomStructure(id: number): string {
    if (!this.structures) return '';
    const structure = this.structures.find((str) => str.id === id);
    return structure ? structure.nom_structure : '';
  }

  getUserRole(user: User): Observable<string[]> {
    return this.roleService
      .getRolesByUser(user.id)
      .pipe(map((roles: Role[]) => roles.map((role) => role.nom)));
  }

  toggleStatus(user: User): void {
    const statut = !user.status;
    this.userService.updateStatus(user.id, statut).subscribe(() => {
      this.toastr.success('Status mis à jour avec avec succès');
      this.loadData();
    });
  }

  /* get filteredUsers(): User[] {
    return this.users.filter(
      (user) =>
        user.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getNomStructure(user.id).toLowerCase().includes(this.searchTerm.toLowerCase()),
      //magasin.adresse?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  } */

      get filteredUsers(): User[] {
    let filtered = this.users.filter(
      (user) =>
        user.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getNomStructure(user.id).toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    // Si l'utilisateur n'est pas admin général, filtrer par sa structure
    if (!this.isGeneralAdmin && this.currentUserStructureId) {
      filtered = filtered.filter(user => 
        user.structure_id === this.currentUserStructureId || !user.structure_id
      );
    }

    return filtered;
  }

  // Pagination
  getPaginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getTotalPages1(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
  getPages(): number[] {
    const totalPages = this.getTotalPages1();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  setItemsPerPage(event: any): void {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1;
  }

  onSearchChange1(): void {
    this.currentPage = 1;
  }
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages1()) {
      this.currentPage = page;
    }
  }
}
