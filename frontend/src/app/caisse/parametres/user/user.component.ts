import { Component, OnInit } from '@angular/core';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { Structure } from '../../../modeles/structure.model';
import { AuthService } from '../../../services/auth.service';
import { StructureService } from '../../../services/structure.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize, forkJoin, of } from 'rxjs';
import { RolePermissionsService } from '../../../services/role-permissions.service';
import { Role } from '../../../modeles/role-permission.model';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  users: User[] = [];
  structures: Structure[] = [];
  userForm: FormGroup;
  isEditMode = false;
  selectedUser: User | null = null;
  isGeneralAdmin:boolean = false;
  selectedUserId: number | null = null;
  isLoading = false;
  roles: Role[] = [];
  roleIds: number[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private structureService: StructureService,
    private roleService: RolePermissionsService,
    private modalService: NgbModal
  ) {
    this.userForm = this.fb.group({
      nom: ['',  [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      role: [[],Validators.required],
      status: [true, Validators.required],
      password: ['', !this.isEditMode ? [Validators.minLength(6)] : []],
      confirmPassword: [''],
      structure_id: [null]
    }, { validator: !this.isEditMode ? this.passwordMatchValidator.bind(this) : null });
  }

  ngOnInit(): void {
    this.isGeneralAdmin= this.authService.isGeneralAdmin();
    this.loadData()
    /* this.loadUsers();
    //if (this.authService.isGeneralAdmin()) {
      this.loadStructures();
    //} */
     /* console.log(this.structures.length)
     this.structures.forEach(str=> {
            console.log(str.nom_structure, str.id, str.code_structure)
         }); */
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
      this.structureService.getAll()
    ]).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: ([users, roles, structures]) => {
        this.users = users;
        this.roles = roles;
        this.structures = structures;
        this.roles = this.roles.filter(s => s.id !=1);
        this.users = this.users.filter(s => s.structure_id !=null);
      },
      error: (err) => console.error('Erreur chargement données', err)
    });
  }


  openModal(content: any, user?: User): void {
    this.selectedUser = user || null;
    this.isEditMode = !!user;

    // Initialisation du formulaire
    if (this.isEditMode && user) {
      // Vérifie si user.role existe, sinon initialise avec un tableau vide
      const userRoles = user.role ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
      
      this.userForm.patchValue({
        ...user,
        role: userRoles, // Utilise le tableau de rôles ou un tableau vide
        password: '',
        confirmPassword: '',
        structure_id: user.structure_id
      });
    } else {
      const defaultStructureId = this.authService.isGeneralAdmin() ? null : this.authService.getUserStructureId();
      this.userForm.reset({
        status: true,
        role: [], // Toujours initialiser comme tableau vide pour les nouveaux utilisateurs
        structure_id: defaultStructureId
      });
    }

    this.modalService.open(content, { size: 'lg' });
}

 /*  onSubmit(): void {
    //console.log("Vous avez cliqué sur le bouton d'envoi")
     if (this.userForm.invalid) {
        console.log('Le formulaire est invalide');
        return;
     }
    const userData = this.userForm.value;
    // On ne garde pas la confirmation du mot de passe
    delete userData.confirmPassword;

    if (this.isEditMode && this.selectedUser) {
      this.userService.update(this.selectedUser.id, userData).subscribe(() => {
        this.loadData();
        this.modalService.dismissAll();
      });
    } else {
      this.userService.create(userData).subscribe(() => {
        this.loadData();
        this.modalService.dismissAll();
      });
    }
  } */

   /*  logFormErrors() {
  Object.keys(this.userForm.controls).forEach(key => {
    const control = this.userForm.get(key);
    if (control?.errors) {
      console.error(`Erreur sur ${key}:`, control.errors);
    }
  });
  if (this.userForm.errors) {
    console.error('Erreurs au niveau du formulaire:', this.userForm.errors);
  }
} */
  onSubmit(): void {
    //this.logFormErrors();
  if (this.userForm.invalid) {
    console.log('Le formulaire est invalide');
    /* console.log('Champs invalides:', {
      nom: this.userForm.get('nom')?.errors,
      telephone: this.userForm.get('telephone')?.errors,
      email: this.userForm.get('email')?.errors,
      role: this.userForm.get('role')?.errors,
      password: this.userForm.get('password')?.errors,
      confirmPassword: this.userForm.get('confirmPassword')?.errors,
      status: this.userForm.get('status')?.errors}); */
    return;
  }

  const userData = this.userForm.value;
  // On ne garde pas la confirmation du mot de passe
  delete userData.confirmPassword;

  // Extraire les rôles sélectionnés (si votre formulaire inclut des rôles)
  const roleIds = userData.role || [];
  delete userData.role; // Supprimer les rôles des données utilisateur

  if (this.isEditMode && this.selectedUser) {
    // Mise à jour de l'utilisateur
    this.userService.update(this.selectedUser.id, userData).subscribe({
      next: (updatedUser) => {
        // Mise à jour des rôles de l'utilisateur
        this.roleService.updateRolesForUser(updatedUser.id, roleIds)
          .subscribe({
            next: () => {
              this.loadData();
              this.modalService.dismissAll();
              // Message de succès si nécessaire
            },
            error: (err) => {
              console.error('Erreur lors de la mise à jour des rôles', err);
              // Gérer l'erreur (message à l'utilisateur)
            }
          });
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur', err);
        // Gérer l'erreur
      }
    });
  } else {
    // Création d'un nouvel utilisateur
    this.userService.create(userData).subscribe({
      next: (newUser) => {
        // Assignation des rôles au nouvel utilisateur
        if (roleIds.length > 0) {
          this.roleService.updateRolesForUser(newUser.id, roleIds)
            .subscribe({
              next: () => {
                this.loadData();
                this.modalService.dismissAll();
                // Message de succès si nécessaire
              },
              error: (err) => {
                console.error('Erreur lors de l\'assignation des rôles', err);
                // Gérer l'erreur (message à l'utilisateur)
              }
            });
        } else {
          this.loadData();
          this.modalService.dismissAll();
        }
      },
      error: (err) => {
        console.error('Erreur lors de la création de l\'utilisateur', err);
        // Gérer l'erreur
      }
    });
  }
}

  deleteUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.delete(id).subscribe(() => {
        this.loadData();
      });
    } 
  }

  toggleStatus(user: User): void {
    user.status = !user.status;
    this.userService.update(user.id, user).subscribe(() => {
      this.loadData();
    });
  }

  

}
