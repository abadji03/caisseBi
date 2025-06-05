// structure.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCommonModule } from '@angular/material/core';
import { Structure } from '../../../modeles/structure.model';
import { StructureService } from '../../../services/structure.service';
import { AuthService } from '../../../services/auth.service'; // Service d'authentification 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-structure',
  standalone: true,
  imports: [MatCommonModule, ReactiveFormsModule, CommonModule, RouterModule, NgbModalModule],
  templateUrl: './structure.component.html',
  styleUrl: './structure.component.css'
})
export class StructureComponent implements OnInit {
  structures: Structure[] = [];
  generalForm!: FormGroup;
  isEditMode: boolean = false;
  currentStructureId: number | null = null;
  isGeneralAdmin: boolean = false;
  selectedStructure: Structure | null = null;
  logoPreview: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private structureService: StructureService,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkUserRole();
    this.loadData();
  }

  initForm(): void {
    this.generalForm = this.fb.group({
    nom_structure: ['', Validators.required],
    logo: [null],
    proprietaire: ['', Validators.required],
    nombre_magasins: [1, [Validators.required, Validators.min(1)]],
    type_structure: ['', Validators.required],
    devise: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
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
    date_creation: [''],
    description: ['']
  });
  }

  checkUserRole(): void {
    // À adapter selon votre système d'authentification
    this.isGeneralAdmin = this.authService.isGeneralAdmin();
    
    if (!this.isGeneralAdmin) {
      // Si c'est un admin de structure, charger les données de sa structure
      const structureId = this.authService.getUserStructureId();
      if (structureId) {
        this.loadStructureDetails(structureId);
      }
    }
  }

  loadData(): void {
    //if (this.isGeneralAdmin) {
      this.loadStructures();
    //}
  }

  loadStructures(): void {
    this.structureService.getAll().subscribe(data => {
      this.structures = data;
    });
  }

  loadStructureDetails(id: number): void {
    this.structureService.getById(id).subscribe(structure => {
      this.selectedStructure = structure;
      this.currentStructureId = structure.id!;
      this.isEditMode = true;
      this.generalForm.patchValue(structure);
      
      if (structure.logo) {
        this.logoPreview = structure.logo;
      }
    });
  }

  showDetails(structure: Structure, content: any): void {
    this.selectedStructure = structure;
    this.modalService.open(content, { size: 'lg' });
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

  /* toggleStructureStatus(structure: Structure): void {
    const newStatus = !structure.estActive;
    this.structureService.updateStatus(structure.id!, newStatus).subscribe(() => {
      this.loadStructures();
    });
  } */

toggleStructureStatus(structure: Structure): void {
  const newStatus = !structure.estActive;
  
  this.structureService.updateStatus(structure.id!, newStatus).subscribe({
    next: () => {
      structure.estActive = newStatus; // Mise à jour optimiste
      // Optionnel : Recharger la liste si nécessaire
      this.loadStructures();
    },
    error: (err) => {
      console.error('Erreur:', err);
      // Revert UI state if error
      structure.estActive = !newStatus;
    }
  });
}

  onSubmitFormsSetting(): void {
    if (this.generalForm.valid) {
      const formData = this.prepareFormData();
      
      if (this.isEditMode && this.currentStructureId) {
        this.structureService.update(this.currentStructureId, formData).subscribe({
          next: () => {
            alert('Structure mise à jour avec succès!');
            this.loadData();
            this.resetForm();
          },
          error: (err) => console.error('Erreur lors de la mise à jour:', err)
        });
      } else {
        this.structureService.create(formData).subscribe({
          next: () => {
            alert('Structure créée avec succès!');
            this.loadData();
            this.resetForm();
          },
          error: (err) => console.error('Erreur lors de la création:', err)
        });
      }
    } else {
      alert('Veuillez remplir correctement le formulaire.');
    }
  }

  prepareFormData(): FormData {
    const formData = new FormData();
    const formValue = this.generalForm.value;

    Object.keys(formValue).forEach(key => {
      if (key !== 'logo' && formValue[key] !== null && formValue[key] !== undefined) {
        formData.append(key, formValue[key]);
      }
    });

    if (this.generalForm.get('logo')?.value instanceof File) {
      formData.append('logo', this.generalForm.get('logo')?.value);
    }

    return formData;
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.generalForm.patchValue({ logo: file });
      
      // Prévisualisation de l'image
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