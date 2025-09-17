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

   // Variables pour le panier intégré
  showPanier = true;
  panierData: Panier | null = null;
  
  private fb = inject(FormBuilder);
  
  ngOnInit() {
    this.updateTime();
    this.bonForm = this.createBonForm();
  }
  
  onTotalPanierChange(total: number): void {
  this.totalPanier = total;
}
  createBonForm(): FormGroup {
    return this.fb.group({
      type: ['', Validators.required],
      description: [''],
      montant: [[Validators.min(0)]],
      refBonOrigine: [''],
      motifAvoir: [''],
      montantAvoir: [[Validators.min(0)]],
      dateBonOrigine: [''],
      remise: [0, [Validators.min(0)]],
      avance: [0, [Validators.min(0)]]
      //panier: this.fb.array([])
    });
  }
  
  // bon.component.ts

// Ajoutez cette méthode pour vérifier si le montant est valide
get isMontantValide(): boolean {
  const montant = this.bonForm.get('montant')?.value;
  return montant !== null && montant !== undefined && montant > 0;
}

// Ou pour une vérification plus spécifique
get montantEstSuperieurAZero(): boolean {
  const montant = this.bonForm.get('montant')?.value;
  return Number(montant) > 0;
}

    get totalBon(): number {
    const formValue = this.bonForm.value;
    const montant = formValue.montant || 0;
    const montantAvoir = formValue.montantAvoir || 0;
    const remise = formValue.remise || 0;
    
    if (this.typeBon === 'retour') {
      return montantAvoir;
    }
    
    // Si on a un panier, utiliser son total, sinon utiliser le montant du formulaire
    //return this.panierData ? this.panierData.totalTTC : montant;
    const totalBase = this.panierData ? this.panierData.totalTTC : montant;
    return totalBase - remise;
  }
  
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `BON-${timestamp}-${random}`;
  }
  
  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;
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
    const remiseBon = Number(formValue.remise) || 0;
    const avanceBon = Number(formValue.avance) || 0;
  // Si on a un panier, utiliser ses données
  if (this.panierData) {
    
    return new Bon({
      numero: this.generatedNumero,
      type: formValue.type,
      description: formValue.description,
      montantTotal: this.panierData.totalTTC - remiseBon, // Total après remise du bon
      remise: remiseBon, // Remise au niveau du bon
      avance: avanceBon, // Avance au niveau du bon
      netAPayer: this.panierData.totalTTC - remiseBon - avanceBon, // Net à payer
      resteAPayer: this.panierData.totalTTC - remiseBon - avanceBon, // Reste à payer
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
   const montantBase = formValue.montant || 0;
  return new Bon({
    numero: this.generatedNumero,
    type: formValue.type,
    description: formValue.description,
    montantTotal: montantBase - remiseBon,
    remise: remiseBon,
    avance: avanceBon,
    netAPayer: montantBase - remiseBon - avanceBon,
    resteAPayer: montantBase - remiseBon - avanceBon,
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
