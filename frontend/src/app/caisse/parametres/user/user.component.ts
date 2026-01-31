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
import { finalize, forkJoin, map, Observable, Subject, takeUntil } from 'rxjs';
import { RolePermissionsService } from '../../../services/role-permissions.service';
import { Role } from '../../../modeles/role-permission.model';
import { ToastrService } from 'ngx-toastr';

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

  errorMessage = '';
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private structureService = inject(StructureService);
  private roleService = inject(RolePermissionsService);
  private toastr = inject(ToastrService);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    //this.isGeneralAdmin = this.authService.isGeneralAdmin();
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
  }

  iniForm(): void {
    this.userForm = this.fb.group(
      {
        nom: ['', [Validators.required, Validators.minLength(2)]],
        telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
        email: ['', [Validators.required, Validators.email]],
        role: [[], Validators.required],
        status: [true, Validators.required],
        password: ['', !this.isEditMode ? [Validators.minLength(6)] : []],
        confirmPassword: [''],
        structure_id: [null],
      },
      { validator: !this.isEditMode ? this.passwordMatchValidator.bind(this) : null },
    );
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

  /*  loadUsers(): void {
    this.userService.getAll().subscribe(users => {
      this.users = users;
    });
  }

  loadStructures(): void {
    this.structureService.getAll().subscribe(structures => {
      this.structures = structures;
      //console.log(this.structures.length)
      this.structures.forEach(str=> {
            console.log(str.nom_structure, str.id, str.code_structure)
         });
    });
  } */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRoleChange(event: any, roleId: number): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const role = this.userForm.get('role')?.value || [];

    if (isChecked) {
      this.userForm.get('role')?.setValue([...role, roleId]);
    } else {
      this.userForm.get('permissions')?.setValue(role.filter((id: number) => id !== roleId));
    }
    /* if (event.target.checked) {
        if (!this.roleIds.includes(roleId)) {
          this.roleIds.push(roleId);
        }
      } else {
        this.roleIds = this.roleIds.filter(id => id !== roleId);
      } */
  }
  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.userService.getAll(),
      this.roleService.getAllRoles(),
      //this.isGeneralAdmin ? this.structureService.getAll() : of([])
      this.structureService.getAll(),
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([users, roles, structures]) => {
          this.users = users;
          this.roles = roles;
          this.structures = structures;
          this.roles = this.roles.filter((s) => s.id != 1);
          this.users = this.users.filter((s) => s.structure_id != null);
          for (const user of this.users) {
            this.roleService.getRolesByUser(user.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe((roles) => {
              this.userRolesMap[user.id] = roles.map((role) => role.nom);
            });
          }
        },
        error: (err) => console.error('Erreur chargement données', err),
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openModal(content: any, user?: User): void {
    this.selectedUser = user || null;
    this.isEditMode = !!user;

    // Initialisation du formulaire
    if (this.isEditMode && user) {
      // Récupère les rôles de l'utilisateur
      this.roleService.getRolesIdByUser(user.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userRole) => {
          // Récupère les détails complets de l'utilisateur
          console.log(userRole.roleIds);
          this.userService.getById(user.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fullUser) => {
              // Patch le formulaire avec toutes les données
              this.userForm.patchValue({
                ...fullUser,
                role: userRole.roleIds || [],
                //password: '',
                //confirmPassword: ''
              });

              // Ouvre le modal une fois que tout est chargé
              //this.modalService.open(content, { size: 'lg' });
            },
            error: (err) => {
              console.error('Erreur lors du chargement des détails utilisateur', err);
              // Fallback si erreur
              this.userForm.patchValue({
                ...user,
                role: userRole.roleIds || [],
                //password: '',
                //confirmPassword: ''
              });
              this.modalService.open(content, { size: 'lg' });
            },
          });
        },
        error: (err) => {
          console.error('Erreur lors du chargement des rôles', err);
          // Fallback si erreur de chargement des rôles
          this.userForm.patchValue({
            ...user,
            role: [],
            //password: '',
            //confirmPassword: ''
          });
          //this.modalService.open(content, { size: 'lg' });
        },
      });
    } else {
      // Mode création - initialisation du formulaire
      /* const defaultStructureId = this.authService.isGeneralAdmin()
        ? null
        : this.authService.getUserStructureId();
      this.userForm.reset({
        status: true,
        role: [],
        structure_id: defaultStructureId,
      }); */
    }

    this.modalService.open(content, { size: 'lg' });
  }

  onSubmit(): void {
    //this.logFormErrors();
    if (this.userForm.invalid) {
      console.log('Le formulaire est invalide');
      return;
    }

    const userData = this.userForm.value;
    // On ne garde pas la confirmation du mot de passe
    delete userData.confirmPassword;

    // Extraire les rôles sélectionnés (si votre formulaire inclut des rôles)
    const roleIds = userData.role || [];
    //delete userData.role; // Supprimer les rôles des données utilisateur

    if (this.isEditMode && this.selectedUser) {
      // Mise à jour de l'utilisateur
      this.userService.update(this.selectedUser.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          // Mise à jour des rôles de l'utilisateur
          console.log('Envoi des rôles pour l’utilisateur', updatedUser.id, roleIds);
          this.roleService.updateRolesForUser(updatedUser.id, roleIds)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Utilisateur mis à jour avec succès');
              this.loadData();
              this.modalService.dismissAll();
              // Message de succès si nécessaire
            },
            error: (err) => {
              console.error('Erreur lors de la mise à jour des rôles', err);
              // Gérer l'erreur (message à l'utilisateur)
            },
          });
        },
        error: (err) => {
          console.error("Erreur lors de la mise à jour de l'utilisateur", err);
          this.toastr.error(err.error?.message);
          this.errorMessage =
            err.error?.message || "Erreur lors de la mise à jour de l'utilisateur";
          // Gérer l'erreur
        },
      });
    } else {
      // Création d'un nouvel utilisateur
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
                // Message de succès si nécessaire
              },
              error: (err) => {
                console.error("Erreur lors de l'assignation des rôles", err);
                //this.toastr.error(err.message);
                //this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du fournisseur';
                // Gérer l'erreur (message à l'utilisateur)
              },
            });
          } else {
            this.loadData();
            this.modalService.dismissAll();
          }
        },
        error: (err) => {
          console.error("Erreur lors de la création de l'utilisateur", err);
          this.toastr.error(err.error?.message);
          this.errorMessage = err.error?.message || "Erreur lors de la création de l'utilisateur";
          // Gérer l'erreur
        },
      });
    }
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
    user.status = !user.status;
    this.userService.update(user.id, user).subscribe(() => {
      this.toastr.success('Status mis à jour avec avec succès');
      this.loadData();
    });
  }

  get filteredUsers(): User[] {
    return this.users.filter(
      (user) =>
        user.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getNomStructure(user.id).toLowerCase().includes(this.searchTerm.toLowerCase()),
      //magasin.adresse?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
