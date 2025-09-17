import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { Produits } from '../../modeles/produit.modele';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ArticlePanier, Panier } from '../../modeles/panier.model';


@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './panier.component.html',
  styleUrl: './panier.component.css'
})
export class PanierComponent implements OnInit {
  @Input() produitsDisponibles: Produits[] = [];
  @Input() showPanierSection= false;
  @Input() titre = '🛒 Panier';
  @Input() inclureTVA = false;
  @Input() tauxTVAList: number[] = [5, 10, 15, 18, 20];
  // panier.component.ts (ajouts)
  @Input() modeCompact = false;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() showRemiseField = true; 
  @Input() showAvanceField = true; 

// Et mettre à jour le template conditionnellement
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrer = new EventEmitter<Panier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnuler = new EventEmitter<void>();

  @Output() totalPanierChange = new EventEmitter<number>();
  
  panierForm!: FormGroup;
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentTime: string = new Date().toLocaleTimeString();
  
  private fb = inject(FormBuilder);
  
  ngOnInit() {
    this.updateTime();
    this.filteredProduits = [...this.produitsDisponibles];
     this.panierForm = this.createPanierForm();
  }
  
  createPanierForm(): FormGroup {
    return this.fb.group({
      remise: [[Validators.min(0)]],
      avance: [[Validators.min(0)]],
      typePaiement: ['', Validators.required],
      tauxTVA: [this.tauxTVAList[0] || 0],
      inclureTVA: [this.inclureTVA],
      panier: this.fb.array([])
    });
  }
  
  get panierArray(): FormArray {
    return this.panierForm.get('panier') as FormArray;
  }

  get totalPanier(): number {
    return this.panierArray.controls.reduce((total, article) => {
      const quantite = article.get('quantite')?.value || 0;
      const prixUnitaire = article.get('prixUnitaire')?.value || 0;
      return total + (quantite * prixUnitaire);
    }, 0);
  }
  
  get totalAPayer(): number {
    const remise = this.panierForm.get('remise')?.value || 0;
    const tvaIncluse = this.panierForm.get('inclureTVA')?.value;
    const tauxTVA = this.panierForm.get('tauxTVA')?.value || 0;
    
    let total = this.totalPanier;
    if(this.showRemiseField) total = this.totalPanier - remise
    
    if (tvaIncluse) {
      total += total * (tauxTVA / 100);
    }
    
    return total;
  }
  
 filterProduits(): void {
    if (!this.searchInput || this.searchInput.length < 2) {
      this.filteredProduits = [];
      return;
    }
    
    this.filteredProduits = this.produitsDisponibles.filter(prod =>
      prod.designation.toLowerCase().includes(this.searchInput.toLowerCase())
    );
    
    console.log('Filtrage produits:', {
      terme: this.searchInput,
      résultats: this.filteredProduits.length,
      produits: this.filteredProduits.map(p => p.designation)
    });
  }
  
  selectProduit(produit: Produits): void {
    this.addArticle(produit);
    this.searchInput = '';
    this.filteredProduits = [];
  }
  
  addArticle(produit: Produits): void {
    const articleGroup = this.fb.group({
      produitId: [produit.id, Validators.required],
      produit: [produit.designation, Validators.required],
      uniteStock: [produit.unite, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prixUnitaire: [produit.prixVenteUnitaire || produit.prixAchatUnitaire, [Validators.required, Validators.min(0)]],
      prixAchatUnitaire: [produit.prixAchatUnitaire]
    });
    
    this.panierArray.push(articleGroup);
    this.totalPanierChange.emit(this.totalAPayer);
  }
  
  removeArticle(index: number): void {
    this.panierArray.removeAt(index);
    this.totalPanierChange.emit(this.totalAPayer);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleTVA(event: any): void {
    const inclureTVA = event.target.checked;
    this.panierForm.patchValue({ inclureTVA });
    this.updateTVA();
  }
  
  updateTVA(): void {
    // Le calcul se fait automatiquement via les getters
  }
  
  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }
  
  enregistrerPanier(): void {
    if (this.panierForm.valid && this.panierArray.length > 0) {
      const panierData: Panier = this.preparePanierData();
      this.onEnregistrer.emit(panierData);
    }
  }

    preparePanierData(): Panier {
      const articles: ArticlePanier[] = this.panierArray.controls.map(control => {
        const produitId = control.get('produitId')?.value;
        const produit = this.produitsDisponibles.find(p => p.id === produitId);
        
        if (!produit) {
          console.error('Produit non trouvé pour ID:', produitId);
          return null;
        }
        
        return new ArticlePanier({
          produit: produit,
          quantite: control.get('quantite')?.value,
          prixVenteUnitaire: control.get('prixUnitaire')?.value,
          prixAchatUnitaire: control.get('prixAchatUnitaire')?.value
        });
      }).filter(article => article !== null) as ArticlePanier[];
      
      const totalHT = articles.reduce((total, article) => {
        return total + (article.quantite * article.prixVenteUnitaire);
      }, 0);
      
      const tvaValue = this.panierForm.get('inclureTVA')?.value ? 
            totalHT * (this.panierForm.get('tauxTVA')?.value / 100) : 0;
      
      // Utiliser les champs seulement s'ils sont visibles
      const remiseValue = this.showRemiseField ? (Number(this.panierForm.get('remise')?.value) || 0) : 0;
      const avanceValue = this.showAvanceField ? (Number(this.panierForm.get('avance')?.value) || 0) : 0;
      
      //const remise = this.panierForm.get('remise')?.value || 0;
      const totalTTC = totalHT + tvaValue - remiseValue;
      //const avance = this.panierForm.get('avance')?.value || 0;
      
      return new Panier({
        articles,
        totalHT: totalHT,
        tva: tvaValue,
        remise: remiseValue, 
        avance: avanceValue, 
        totalTTC: totalTTC,
        statut: 'EN_COURS'
      });
    }
  
  annulerPanier(): void {
    this.panierForm.reset();
    this.panierArray.clear();
    this.onAnnuler.emit();
  }
  
  resetPanier(): void {
    this.panierArray.clear();
  }
}
