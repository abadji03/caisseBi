import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './roles-permissions.component.html',
  styleUrl: './roles-permissions.component.css'
})
export class RolesPermissionsComponent implements OnInit {

  isEditMode: boolean = false;
  permissions = [
      { id: 1, name: 'Administrateur', level: 3, type: 'full_access' },
      { id: 2, name: 'Gérant', level: 2, type: 'manage_users' },
    ];
    permissionForm: FormGroup;
    currentPermissionId: number | null = null

  constructor(private fb: FormBuilder){

    this.permissionForm = this.fb.group({
      name: ['', Validators.required],
      level: [1, Validators.required],
      type: ['', Validators.required],
    });
    
  }
  ngOnInit(): void {
    
  }

   openPermissionModal() {
    this.isEditMode = false;
    this.permissionForm.reset({ level: 1, type: 'view_only' });
    var modal = new (window as any).bootstrap.Modal(document.getElementById('permissionModal')!);
    modal.show();
  }

  editPermission(permission: any) {
    this.isEditMode = true;
    this.currentPermissionId = permission.id;
    this.permissionForm.setValue({
      name: permission.name,
      level: permission.level,
      type: permission.type,
    });
    var modal = new (window as any).bootstrap.Modal(document.getElementById('permissionModal')!);
    modal.show();
  }

  onSubmitDroit() {
    if (this.isEditMode && this.currentPermissionId !== null) {
      // Modification d'un droit existant
      const index = this.permissions.findIndex(p => p.id === this.currentPermissionId);
      if (index !== -1) {
        this.permissions[index] = {
          id: this.currentPermissionId,
          ...this.permissionForm.value
        };
      }
    } else {
      // Ajout d'un nouveau droit
      const newPermission = {
        id: this.permissions.length + 1,
        ...this.permissionForm.value
      };
      this.permissions.push(newPermission);
    }
    document.getElementById('permissionModal')!.click(); // Fermer le modal
  }

  deletePermission(id: number) {
    this.permissions = this.permissions.filter(p => p.id !== id);
  }
}
