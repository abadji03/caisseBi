import { Component, OnInit } from '@angular/core';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { Structure } from '../../../modeles/structure.model';
import { AuthService } from '../../../services/auth.service';
import { StructureService } from '../../../services/structure.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private structureService: StructureService,
    private modalService: NgbModal
  ) {
    this.userForm = this.fb.group({
      nom: ['', Validators.required],
      telephone: ['', Validators.required],
      email: ['', [Validators.required]],
      role: ['employee', Validators.required],
      typeUser: ['employe', Validators.required],
      status: [true, Validators.required],
      password: ['', [Validators.required]],
      confirmPassword: ['', Validators.required],
      structure_id: [null]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.isGeneralAdmin= this.authService.isGeneralAdmin();
    this.loadUsers();
    //if (this.authService.isGeneralAdmin()) {
      this.loadStructures();
    //}
     /* console.log(this.structures.length)
     this.structures.forEach(str=> {
            console.log(str.nom_structure, str.id, str.code_structure)
         }); */
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value 
      ? null : { mismatch: true };
  }

  loadUsers(): void {
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
  }

  openModal(content: any, user?: User): void {
    this.selectedUser = user || null;
    this.isEditMode = !!user;

    // Initialisation du formulaire
    if (this.isEditMode && user) {
      this.userForm.patchValue({
        ...user,
        password: '',
        confirmPassword: '',
        structure_id: user.structure_id
      });
    } else {
      const defaultStructureId = this.authService.isGeneralAdmin() ? null : this.authService.getUserStructureId();
      this.userForm.reset({
        status: true,
        role: 'employee',
        typeUser: 'employe',
        structure_id: defaultStructureId
      });
    }

    this.modalService.open(content, { size: 'lg' });
  }

  onSubmit(): void {
    console.log("Vous avez cliqué sur le bouton d'envoi")
     if (this.userForm.invalid) {
        console.log('Le formulaire est invalide');
        return;
     }
    const userData = this.userForm.value;
    // On ne garde pas la confirmation du mot de passe
    delete userData.confirmPassword;

    if (this.isEditMode && this.selectedUser) {
      this.userService.update(this.selectedUser.id, userData).subscribe(() => {
        this.loadUsers();
        this.modalService.dismissAll();
      });
    } else {
      this.userService.create(userData).subscribe(() => {
        this.loadUsers();
        this.modalService.dismissAll();
      });
    }
  }

  deleteUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.delete(id).subscribe(() => {
        this.loadUsers();
      });
    }
  }

  toggleStatus(user: User): void {
    this.userService.updateStatus(user.id, !user.status).subscribe(() => {
      this.loadUsers();
    });
  }

  

}
