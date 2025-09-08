import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Permission, Role, RolePermission } from '../../../modeles/role-permission.model';
import { RolePermissionsService } from '../../../services/role-permissions.service';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.css'],
})
export class RolesPermissionsComponent implements OnInit {
  isEditMode = false;
  isLoading = false;
  roles: Role[] = [];
  allPermissions: Permission[] = [];
  currentRoleId: number | null = null;

  rolePermission1: RolePermission | null = null;

  roleForm: FormGroup;
  private fb = inject(FormBuilder);
  private rolePermissionsService = inject(RolePermissionsService);
  constructor() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      // description: [''],
      permissions: [[]],
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadAllPermissions();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.rolePermissionsService
      .getAllRoles()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (roles) => (this.roles = roles.filter((m) => m.id !== 1)),
        error: (err) => console.error('Erreur lors du chargement des rôles', err),
      });
  }

  loadAllPermissions(): void {
    this.rolePermissionsService.getAllPermissions().subscribe({
      next: (permissions) => (this.allPermissions = permissions),
      error: (err) => console.error('Erreur lors du chargement des permissions', err),
    });
  }

  openRoleModal(): void {
    this.isEditMode = false;
    this.roleForm.reset({
      name: '',
      //description: '',
      permissions: [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modal = new (window as any).bootstrap.Modal(document.getElementById('roleModal'));
    modal.show();
  }

  editRole(role: Role): void {
    this.isEditMode = true;
    this.currentRoleId = role.id!;

    this.rolePermissionsService.getPermissionsIdByRole(role.id!).subscribe({
      next: (rolePermissions) => {
        this.roleForm.patchValue({
          name: role.nom,
          // description: role.description,
          permissions: rolePermissions.permissionIds || [],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modal = new (window as any).bootstrap.Modal(document.getElementById('roleModal'));
        modal.show();
      },
      error: (err) => console.error('Erreur lors du chargement des permissions du rôle', err),
    });
  }

  onSubmitRole(): void {
    if (this.roleForm.invalid) return;

    const roleData = {
      nom: this.roleForm.value.name,
      //description: this.roleForm.value.description
    };

    const permissionIds = this.roleForm.value.permissions;

    if (this.isEditMode && this.currentRoleId) {
      // Mise à jour du rôle
      this.rolePermissionsService.updateRole(this.currentRoleId, roleData).subscribe({
        next: () => {
          // Mise à jour des permissions
          this.rolePermissionsService
            .updatePermissionsForRole(this.currentRoleId!, permissionIds)
            .subscribe({
              next: () => {
                this.loadRoles();
                this.closeModal();
              },
              error: (err) => console.error('Erreur lors de la mise à jour des permissions', err),
            });
        },
        error: (err) => console.error('Erreur lors de la mise à jour du rôle', err),
      });
    } else {
      // Création d'un nouveau rôle
      this.rolePermissionsService.createRole(roleData).subscribe({
        next: (newRole) => {
          // Assignation des permissions
          this.rolePermissionsService
            .updatePermissionsForRole(newRole.id!, permissionIds)
            .subscribe({
              next: () => {
                this.loadRoles();
                this.closeModal();
              },
              error: (err) => console.error("Erreur lors de l'assignation des permissions", err),
            });
        },
        error: (err) => console.error('Erreur lors de la création du rôle', err),
      });
    }
  }

  /* deleteRole(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.rolePermissionsService.deleteRole(id)
        .subscribe({
          next: () => this.loadRoles(),
          error: (err) => console.error('Erreur lors de la suppression du rôle', err)
        });
    }
  } */

  deleteRole(roleId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      this.isLoading = true;

      // D'abord, récupérer les permissions associées au rôle
      this.rolePermissionsService.getPermissionsIdByRole(roleId).subscribe({
        next: (rolePermissions) => {
          const permissionIds = rolePermissions.permissionIds || [];

          // Supprimer d'abord les associations de permissions
          if (permissionIds.length > 0) {
            //console.log('Succés');
            this.rolePermissionsService.removePermissionsFromRole(roleId, permissionIds).subscribe({
              next: () => {
                // Puis supprimer le rôle lui-même
                this.deleteRoleFinally(roleId);
              },
              error: (err) => {
                this.isLoading = false;
                console.error('Erreur lors de la suppression des permissions du rôle', err);
                //this.errorMessage = 'Erreur lors de la suppression des associations de permissions';
              },
            });
          } else {
            // Si pas de permissions, supprimer directement le rôle
            this.deleteRoleFinally(roleId);
            //console.log('Echec');
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Erreur lors de la récupération des permissions du rôle', err);
          //this.errorMessage = 'Erreur lors de la récupération des permissions associées';
        },
      });
    }
  }

  private deleteRoleFinally(roleId: number): void {
    this.rolePermissionsService.deleteRole(roleId).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadRoles();
        //this.successMessage = 'Rôle supprimé avec succès';
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur lors de la suppression du rôle', err);
        //this.errorMessage = 'Erreur lors de la suppression du rôle';
      },
    });
  }

  closeModal(): void {
    const modal = document.getElementById('roleModal');
    if (modal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).bootstrap.Modal.getInstance(modal).hide();
    }
  }

  comparePermissions(p1: Permission, p2: Permission): boolean {
    return p1 && p2 ? p1.id === p2.id : p1 === p2;
  }

  onPermissionChange(permissionId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const permissions = this.roleForm.get('permissions')?.value || [];

    if (isChecked) {
      this.roleForm.get('permissions')?.setValue([...permissions, permissionId]);
    } else {
      this.roleForm
        .get('permissions')
        ?.setValue(permissions.filter((id: number) => id !== permissionId));
    }
  }
}
