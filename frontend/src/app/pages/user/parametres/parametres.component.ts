import { Component } from '@angular/core';
import { ParametreConfiguration, Role, User, Utilisateur } from '../../../modeles/user.model';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-parametres',
  standalone:true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent {

  generalForm!: FormGroup;
  isEditMode: boolean = false; // Gère l'affichage du bouton (Enregistrer / Modifier)
  users: User[] = [];
  userForm: FormGroup;
  selectedUser: User | null = null;
  modal: any;
  permissions = [
    { id: 1, name: 'Administrateur', level: 3, type: 'full_access' },
    { id: 2, name: 'Gérant', level: 2, type: 'manage_users' },
  ];

  permissionForm: FormGroup;
  currentPermissionId: number | null = null

  constructor(private fb: FormBuilder,private userService: UserService) {

    this.permissionForm = this.fb.group({
      name: ['', Validators.required],
      level: [1, Validators.required],
      type: ['', Validators.required],
    });

    this.userForm = this.fb.group({
      nom: ['', Validators.required],
      telephone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['employee', Validators.required],
      userType: ['employe', Validators.required],
      status: [true, Validators.required],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });

    this.generalForm = this.fb.group({
      name: ['', Validators.required],
      logo: [null],
      owner: ['', Validators.required],
      numStores: [1, [Validators.required, Validators.min(1)]],
      type: ['', Validators.required],
      currency: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      nif: [''],
      rc: [''],  // Nouveau : Registre de commerce
      legalStatus: [''], // Nouveau : Statut juridique
      taxRegime: [''], // Nouveau : Régime fiscal
      bankName: [''], // Nouveau : Nom de la banque
      bankAccount: [''], // Nouveau : Numéro de compte bancaire
      mobileMoney: [''], // Nouveau : Fournisseur Mobile Money
      employees: [0, Validators.min(0)], // Nouveau : Nombre d’employés
      adminManager: [''], // Nouveau : Responsable administratif
      openingHours: [''], // Nouveau : Horaires d’ouverture
      closingDays: [''], // Nouveau : Jours de fermeture
      activitySector: [''], // Nouveau : Secteur d’activité
      surfaceArea: [''], // Nouveau : Surface de vente
      initialStock: [''], // Nouveau : Stock initial
      website: [''], // Nouveau : Site web
      socialMedia: [''], // Nouveau : Réseaux sociaux
      secondaryContact: [''], // Nouveau : Contact secondaire
      accessCode: [''], // Nouveau : Code d’accès
      trustedPerson: [''], // Nouveau : Personne de confiance
      insurance: [''], // Nouveau : Assurances souscrites
      creationDate:[''],
      description:['']
    });
  }

  ngOnInit(): void {

    // Simuler une récupération de données pour la modification
    //this.loadStructureData();
  }

  loadStructureData(): void {
    // Simulation d'un chargement depuis une API
    const existingData = {
      name: 'Ma Structure',
      logo: null,
      owner: 'Jean Dupont',
      numStores: 5,
      type: 'Boutique',
      currency: 'FCFA',
      email: 'contact@mastructure.com',
      phone: '+221 77 123 45 67',
      address: 'Dakar, Sénégal',
      nif: 'SN123456789',
      creationDate: '2020-01-01',
      description: 'Une boutique spécialisée en produits locaux.'
    };

    this.generalForm.patchValue(existingData);
    this.isEditMode = true;
  }

  onSubmitFormsSetting(): void {
    if (this.generalForm.valid) {
      console.log('Données soumises :', this.generalForm.value);
      alert('Informations enregistrées avec succès !');
    } else {
      alert('Veuillez remplir correctement le formulaire.');
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.generalForm.patchValue({ logo: file });
    }
  }

  loadUsers() {
    this.users = this.userService.getUsers();
  }

  openModal(user: User | null) {
    this.selectedUser = user;
    this.isEditMode = !!user;
    if (user) {
      this.userForm.patchValue(user);
    } else {
      this.userForm.reset({ status: true });
    }

    this.modal = new( window as any).bootstrap.Modal(document.getElementById('userModal'));
    this.modal.show();
  }

  onSubmitUser() {
    if (this.userForm.invalid) return;

    if (this.isEditMode && this.selectedUser) {
      this.userService.updateUser(this.selectedUser.id, this.userForm.value);
    } else {
      this.userService.addUser(this.userForm.value);
    }

    this.loadUsers();
    this.modal.hide();
  }

  deleteUser(id: number) {
    this.userService.deleteUser(id);
    this.loadUsers();
  }

  toggleStatus(user: User) {
    user.status = !user.status;
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
