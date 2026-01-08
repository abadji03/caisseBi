import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ModePaiement, Paiement, PaiementAvecFichier } from '../../modeles/paiement.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paiement.component.html',
  styleUrl: './paiement.component.css'
})
export class PaiementComponent implements OnInit, OnChanges {

  @Input() showPaiementForm  = false;
  @Input() titre = 'Formulaire d\'ajout d\'un paiement';
  @Input() typeEntite: 'client' | 'fournisseur'|'autre' = 'fournisseur';
  @Input() entiteId?: number;
  @Input() entiteNom?: string;
  // Ajouter un Input pour forcer la réinitialisation
  @Input() resetFormPaiement = false;
  @Input() showFichierField= true;
  @Input() modesPaiement: ModePaiement[] = [
    new ModePaiement({ libelle: 'Espèce' }),
    new ModePaiement({ libelle: 'Carte' }),
    new ModePaiement({ libelle: 'Virement' }),
     new ModePaiement({ libelle: 'Wave' }),
    new ModePaiement({ libelle: 'Orange Money' }),
    new ModePaiement({ libelle: 'Chèque' }),
    new ModePaiement({ libelle: 'Autre' }),
  ];

  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerPaiement = new EventEmitter<PaiementAvecFichier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerPaiement = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onReinitiliaserPaiementFor = new EventEmitter<void>();
  
  paiementForm!: FormGroup;
  fichierSelectionne: File | null = null;
  generatedNumero: string = this.generateNumero();
  private fb = inject(FormBuilder);
  maxFileSize = 10 * 1024 * 1024; // 10MB

  ngOnInit() {
    // Initialisation si nécessaire
        this.paiementForm = this.createPaiementForm();

  }
  // Surveiller les changements de resetFormPaiement
    ngOnChanges(changes: SimpleChanges) {
      if (changes['resetFormPaiement'] && changes['resetFormPaiement'].currentValue === true) {
        console.log('ResetForm déclenché - Réinitialisation du formulaire de paiement');
        this.resetForm();
      }
    }

  createPaiementForm(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      montant: [0, [Validators.required, Validators.min(0)]],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      methodePaiement: ['', Validators.required],
      remise: [0, [Validators.min(0)]],
      avance: [0, [Validators.min(0)]]
    });
  }

  // Méthode pour générer un numéro unique de bon
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `NP-${timestamp}-${random}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      // Validation de la taille
      if (file.size > this.maxFileSize) {
        alert(`Le fichier ${file.name} dépasse la taille maximale de 10MB`);
        this.fichierSelectionne = null;
        event.target.value = '';
        return;
      }

      // Validation du type
      if (!this.isFileTypeValid(file)) {
        alert(`Le format ${file.type} n'est pas accepté`);
        this.fichierSelectionne = null;
        event.target.value = '';
        return;
      }

      this.fichierSelectionne = file;
    }
  }

  // Méthode pour valider le type de fichier
  private isFileTypeValid(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return allowedTypes.includes(file.type);
  }

  // Méthode pour supprimer le fichier sélectionné
  removeFile(): void {
    this.fichierSelectionne = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Obtenir l'icône du fichier en fonction de son type
  getFileIcon(file: File): string {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('image')) return '🖼️';
    if (file.type.includes('word')) return '📝';
    return '📎';
  }

  submitPaiement(): void {
    if (this.paiementForm.valid) {
      const { paiement, fichier } = this.preparePaiementData();
      console.log('Paiement prêt à être enregistré:', paiement, fichier)
      this.onEnregistrerPaiement.emit({ paiement, fichier });
    }
  }

  preparePaiementData(): { paiement: Paiement, fichier: File | null } {
    const formValue = this.paiementForm.value;
    
    const paiement = new Paiement({
      description: formValue.description,
      montant: formValue.montant,
      date: new Date(formValue.date),
      methodePaiement: formValue.methodePaiement,
      numero: this.generatedNumero,
      //typeEntite:this.typeEntite,
      //remise: formValue.remise,
      //avance: formValue.avance,
      //fichierFile: this.fichierSelectionne || undefined
    });

    // Assigner l'ID de l'entité selon le type
    if (this.typeEntite === 'client') {
      paiement.clientId = this.entiteId;
      paiement.typePaiement = 'client';
    } 
    else if (this.typeEntite === 'fournisseur') {
      paiement.fournisseurId = this.entiteId;
      paiement.typePaiement = 'fournisseur';
    } else {
      paiement.typePaiement = 'autre';
    }

    return {paiement:paiement,fichier:this.fichierSelectionne};
  }

  resetForm(): void {
    this.paiementForm.reset({
      description: '',
      montant: 0,
      date: new Date().toISOString().substring(0, 10),
      methodePaiement: '',
      //remise: 0,
      //avance: 0
    });
    this.fichierSelectionne = null;
    
    // Réinitialiser également l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.onReinitiliaserPaiementFor.emit();
  }

  annulerPaiement(): void {
    this.resetForm();
    this.onAnnulerPaiement.emit();
  }

  // Helper pour accéder facilement aux contrôles du formulaire
  get f() {
    return this.paiementForm.controls;
  }

 }
