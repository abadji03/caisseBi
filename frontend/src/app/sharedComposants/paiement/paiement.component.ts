import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { ModePaiement, Paiement } from '../../modeles/paiement.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paiement.component.html',
  styleUrl: './paiement.component.css'
})
export class PaiementComponent implements OnInit {

  @Input() showPaiementForm  = false;
  @Input() titre = 'Formulaire d\'ajout d\'un paiement';
  @Input() typeEntite: 'client' | 'fournisseur' = 'fournisseur';
  @Input() entiteId?: number;
  @Input() entiteNom?: string;
  @Input() showFichierField= true;
  @Input() modesPaiement: ModePaiement[] = [
    new ModePaiement({ libelle: 'Carte' }),
    new ModePaiement({ libelle: 'Virement' }),
    new ModePaiement({ libelle: 'Mobile Money' }),
    new ModePaiement({ libelle: 'Espèce' })
  ];
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerPaiement = new EventEmitter<Paiement>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerPaiement = new EventEmitter<void>();
  
  paiementForm!: FormGroup;
  fichierSelectionne: File | null = null;
  private fb = inject(FormBuilder);

  ngOnInit() {
    // Initialisation si nécessaire
        this.paiementForm = this.createPaiementForm();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fichierSelectionne = file;
    }
  }

  submitPaiement(): void {
    if (this.paiementForm.valid) {
      const paiementData: Paiement = this.preparePaiementData();
      this.onEnregistrerPaiement.emit(paiementData);
    }
  }

  preparePaiementData(): Paiement {
    const formValue = this.paiementForm.value;
    
    const paiement = new Paiement({
      description: formValue.description,
      montant: formValue.montant,
      date: new Date(formValue.date),
      methodePaiement: formValue.methodePaiement,
      //typeEntite:this.typeEntite,
      //remise: formValue.remise,
      //avance: formValue.avance,
      fichierFile: this.fichierSelectionne || undefined
    });

    // Assigner l'ID de l'entité selon le type
    if (this.typeEntite === 'client') {
      paiement.clientId = this.entiteId;
      paiement.typePaiement = 'client';
    } else {
      paiement.fournisseurId = this.entiteId;
      paiement.typePaiement = 'fournisseur';
    }

    return paiement;
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
