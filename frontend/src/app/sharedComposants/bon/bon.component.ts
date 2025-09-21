/* eslint-disable prefer-const */
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Produits } from '../../modeles/produit.modele';
import { Bon } from '../../modeles/bon.model';
import { Panier } from '../../modeles/panier.model';
import { PanierComponent } from '../panier/panier.component';

@Component({
  selector: 'app-bon',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule,  FormsModule, PanierComponent],
  templateUrl: './bon.component.html',
  styleUrl: './bon.component.css'
})
export class BonComponent implements OnInit{
  
 @Input() produitsDisponibles: Produits[] = [];
  @Input() showBonForm = false;
  @Input() typeEntite: 'client' | 'fournisseur' = 'client';
  @Input() entiteId?: number;
  @Input() entiteNom?: string;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<void>();
  
  bonForm!: FormGroup;
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentDate: string = new Date().toLocaleDateString();
  currentTime: string = new Date().toLocaleTimeString();
  generatedNumero: string = this.generateNumero();
  typeBon = '';
  panierDisabled = false;
  totalPanier = 0; // variable pour le total du panier pour le comparer au montant du bon

  erreurs: string[] = []; // Pour stocker les messages d'erreur
  modeMontant: 'saisi' | 'panier' = 'panier'; // valeur par défaut

  // Variables pour le panier intégré
  showPanier = true;
  panierData: Panier | null = null;
  
  private fb = inject(FormBuilder);
  
  ngOnInit() {
    this.updateTime();
    this.bonForm = this.createBonForm();

    // Écouter les changements pour valider en temps réel
    this.bonForm.valueChanges.subscribe(() => {
      this.validerMontants();
    });
  }
  
  onTotalPanierChange(total: number): void {
  this.totalPanier = total;
}
  createBonForm(): FormGroup {
    return this.fb.group({
      type: ['', Validators.required],
      description: [''],
      //montant: [[Validators.min(0)]],
      refBonOrigine: [''],
      motifAvoir: [''],
      montantAvoir: [[Validators.min(0)]],
      dateBonOrigine: [''],
      remise: [0, [Validators.min(0)]],
      avance: [0, [Validators.min(0)]]
      //panier: this.fb.array([])
    });
  }
  
 // Validateur personnalisé pour la remise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maxRemiseValidator(control: any) {
    const montant = this.montantBase;
    const remise = control.value;
    
    if (montant > 0 && remise > montant) {
      return { maxRemise: true };
    }
    return null;
  }

  // Validateur personnalisé pour l'avance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maxAvanceValidator(control: any) {
    const montant = this.montantBase;
    const remise = this.bonForm?.get('remise')?.value || 0;
    const avance = control.value;
    const montantApresRemise = montant - remise;
    
    if (montantApresRemise > 0 && avance > montantApresRemise) {
      return { maxAvance: true };
    }
    return null;
  }

  // Getter pour le montant de base (panier ou montant direct)
  get montantBase(): number {
    if (this.modeMontant === 'panier') {
      return this.totalPanier;
    }
    return this.bonForm.get('montantAvoir')?.value || 0;
  }

  // Validation des montants
  validerMontants(): void {
    this.erreurs = [];
    const montant = this.montantBase;
    const remise = this.bonForm.get('remise')?.value || 0;
    const avance = this.bonForm.get('avance')?.value || 0;

    const montantApresRemise = montant - remise;

    // Validation de la remise
    if (remise > montant) {
      this.erreurs.push(`La remise (${remise} F CFA) ne peut pas dépasser le montant du bon (${montant} F CFA)`);
    }

    // Validation de l'avance

    if (avance > montantApresRemise || avance > montant) {
      this.erreurs.push(`L'avance (${avance} F CFA) ne peut pas dépasser le montant après remise (${montantApresRemise} F CFA)`);
    }

    // Validation du panier
    /* if (this.totalPanier > 0 && this.totalPanier  > (this.bonForm.get('montant')?.value || 0)) {
      this.erreurs.push(`Le total du panier (${this.totalPanier } F CFA) ne peut pas dépasser le montant du bon (${this.bonForm.get('montant')?.value || 0} F CFA)`);
    } */
  }

  // Ajoutez cette méthode pour vérifier si le montant est valide
 /*  get isMontantValide(): boolean {
    const montant = this.bonForm.get('montant')?.value;
    return montant !== null && montant !== undefined && montant > 0;
  }

  // Ou pour une vérification plus spécifique
  get montantEstSuperieurAZero(): boolean {
    const montant = this.bonForm.get('montant')?.value;
    return Number(montant) > 0;
  } */

  get resteAPayer(): number {
    const total = this.totalBon;
    const avance = this.bonForm.get('avance')?.value || 0;
    return Math.max(0, total - avance);
  }
  get totalBon(): number {
    const formValue = this.bonForm.value;
    //const montant = formValue.montant || 0;
    //const montantAvoir = formValue.montantAvoir || 0;
    const remise = formValue.remise || 0;
    //const remise = this.bonForm.get('remise')?.value || 0;
    
    if (this.typeBon === 'retour') {
       return 0;
      //return montantAvoir;
      //return this.bonForm.get('montantAvoir')?.value || 0;
    }
    
    // Si on a un panier, utiliser son total, sinon utiliser le montant du formulaire
    //return this.panierData ? this.panierData.totalTTC : montant;
    //const totalBase = this.panierData ? this.panierData.totalTTC : montant;
    //return totalBase - remise;
    const base = this.montantBase;
    return Math.max(0, base - remise);
  }
  
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `BON-${timestamp}-${random}`;
  }
  
  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;
    if (this.typeBon === 'commande' || this.typeBon === 'livraison') {
      this.modeMontant = 'panier';
    } 
    else if (this.typeBon === 'retour') {
      this.modeMontant = 'saisi';
    }
  }
  
  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }
  
  submitBon(): void {
    if (this.bonForm.valid) {
      const bonData: Bon = this.prepareBonData();
      console.log('Bon à enregistrer :', bonData);
      this.onEnregistrerBon.emit(bonData);
    }
  }

   // Méthode pour gérer l'événement du panier
  onPanierEnregistre(panier: Panier): void {
    this.panierData = panier;
  }
  
  // Méthode pour gérer l'annulation du panier
  onPanierAnnule(): void {
    this.panierData = null;
  }

prepareBonData(): Bon {
  const formValue = this.bonForm.value;
  // Récupérer remise et avance du formulaire bon
    const remise = Number(formValue.remise) || 0;
    const avance = Number(formValue.avance) || 0;
  // Si on a un panier, utiliser ses données
  let base = this.montantBase;
  if (this.modeMontant === 'panier' && this.panierData) {
    
    return new Bon({
      numero: this.generatedNumero,
      type: formValue.type,
      description: formValue.description,
      montantTotal: base - remise, // Total après remise du bon
      remise, // Remise au niveau du bon
      avance, // Avance au niveau du bon
      netAPayer: base - remise - avance, // Net à payer
      resteAPayer: base- remise - avance, // Reste à payer
      dateBon: new Date(),
      statutBon: 'brouillon',
      panier: {
        produits: this.panierData.articles.map(article => ({
          ...article.produit,
          quantite: article.quantite
        })),
        totalHT: this.panierData.totalHT,
        tva: this.panierData.tva,
        totalTTC: this.panierData.totalTTC
      }
    });
  }
  
  // Sinon, créer un bon sans panier détaillé
  //const montantBase = formValue.montant || 0;
  return new Bon({
    numero: this.generatedNumero,
    type: formValue.type,
    description: formValue.description,
    montantTotal: base - remise,
    remise,
    avance,
    netAPayer: base - remise - avance,
    resteAPayer: base - remise - avance,
    dateBon: new Date(),
    statutBon: 'brouillon'
  });
}

// Dans BonComponent
get produitsPanier(): Produits[] {
  if (!this.panierData) return [];
  
  return this.panierData.articles.map(article => {
    return {
      ...article.produit,
      quantite: article.quantite,
      prixVenteUnitaire: article.prixVenteUnitaire
    };
  });
}
  
  annulerBon(): void {
    this.bonForm.reset();
    //this.panier.clear();
    this.panierData = null;
    this.onAnnulerBon.emit();
  }
}
