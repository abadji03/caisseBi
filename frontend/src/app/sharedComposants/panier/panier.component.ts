import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Produits } from '../../modeles/produit.modele';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ArticlePanier, Panier } from '../../modeles/panier.model';
import { BonBrouillonService } from '../../services/bon-brouillon.service';
import { PaniersService } from '../../services/paniers.service';
import { ArticlesPanierService } from '../../services/articles-panier.service';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './panier.component.html',
  styleUrl: './panier.component.css'
})
export class PanierComponent implements OnInit,OnChanges, OnDestroy {
  @Input() produitsDisponibles: Produits[] = [];
  @Input() showPanierSection= false;
  @Input() titre = '🛒 Panier';
  @Input() inclureTVA = false;
  @Input() tauxTVAList: number[] = [5, 10, 15, 18, 20];
  // panier.component.ts (ajouts)
  @Input() modeCompact = false;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() showButtonsActions = true;
  @Input() showRemiseField = true; 
  @Input() showAvanceField = true; 
  @Input() typeEntite: 'client' | 'fournisseur' = 'client';
  // Ajouter un Input pour la réinitialisation externe
  @Input() resetPanier = false;

  isFormDisabled = false; // false par défaut
  ispanierValid = false; // Pour suivre la validité du panier

  private destroy$ = new Subject<void>();


// Et mettre à jour le template conditionnellement
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrer = new EventEmitter<Panier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnuler = new EventEmitter<void>();
  @Output() showBonButtons = new EventEmitter<boolean>();

  @Output() totalPanierChange = new EventEmitter<number>();
  
  panierForm!: FormGroup;
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentTime: string = new Date().toLocaleTimeString();

  panierBrouillon: Panier | null = null;
  
  private fb = inject(FormBuilder);
  private bonBrouillonService= inject(BonBrouillonService);
  private panierService = inject(PaniersService);
  private articlesPanierService = inject(ArticlesPanierService);
  
  ngOnInit() {
    this.updateTime();
    this.filteredProduits = [...this.produitsDisponibles];
    this.panierForm = this.createPanierForm();

    // S'abonner au panier brouillon
    /* this.bonBrouillonService.panierBrouillon$.subscribe(panier => {
      this.panierBrouillon = panier;
      if (panier) {
        this.chargerPanierBrouillon(panier);
      }
    }); */

    this.panierForm.valueChanges.subscribe(() => {
      this.totalPanierChange.emit(this.totalAPayer);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
/*   private chargerPanierBrouillon(panier: Panier): void {
    
    // Charger les articles du panier
    panier.articles.forEach(article => {
      this.ajouterArticleAuForm(article);
    });

    // Charger les paramètres du panier
    this.panierForm.patchValue({
      remise: panier.remise || 0,
      avance: panier.avance || 0,
      //typePaiement: panier.typePaiement || 'caisse',
      tauxTVA: panier.tauxTVA || this.tauxTVAList[0],
      inclureTVA: !!panier.tva
    });

    this.isFormDisabled = true;
    this.showBonButtons.emit(true);
  } */
  /* private ajouterArticleAuForm(article: ArticlePanier): void {
    const articleGroup = this.fb.group({
      produitId: [article.produitId, Validators.required],
      produit: [article.produit?.designation, Validators.required],
      uniteStock: [article.produit?.unite, Validators.required],
      quantite: [article.quantite, [Validators.required, Validators.min(1)]],
      prixUnitaire: [article.prixUnitaire, [Validators.required, Validators.min(0)]],
      prixAchatUnitaire: [article.prixAchatUnitaire],
      prixVenteUnitaire: [article.prixVenteUnitaire]
    });
    
    this.panierArray.push(articleGroup);
  } */

  /* private sauvegarderPanierAuto(): void {
    if (this.panierForm.valid && this.panierArray.length > 0) {
      const panierData = this.preparePanierData();
      
      // Associer l'ID du panier brouillon si existant
      if (this.panierBrouillon) {
        panierData.id = this.panierBrouillon.id;
      }

      panierData.statut = 'en_cours';
      this.bonBrouillonService.setPanierBrouillon(panierData);
    }
  } */

  createPanierForm(): FormGroup {
    return this.fb.group({
      remise: [0,[Validators.min(0)]],
      avance: [0,[Validators.min(0)]],
      typePaiement: ['caisse', Validators.required],
      tauxTVA: [this.tauxTVAList[0] || 0],
      inclureTVA: [this.inclureTVA],
      panier: this.fb.array([])
    });
  }

  // Ajouter une méthode de réinitialisation
  reinitialiserPanier(): void {
    this.panierForm.reset({
      remise: 0,
      avance: 0,
      typePaiement: 'caisse',
      tauxTVA: this.tauxTVAList[0] || 0,
      inclureTVA: this.inclureTVA
    });
    
    this.panierArray.clear();
    this.searchInput = '';
    this.filteredProduits = [];
    this.isFormDisabled = false;
    this.ispanierValid = false;
    this.showBonButtons.emit(false);
    
    // Réactiver le formulaire
    this.panierForm.enable();
     // Émettre le changement de total
    this.totalPanierChange.emit(0);
    
    console.log('✅ Panier réinitialisé');
  }

  // Surveiller les changements de resetPanier
  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetPanier'] && changes['resetPanier'].currentValue === true) {
      this.reinitialiserPanier();
    }

    // Réagir aux changements de typeEntite
    if (changes['typeEntite']) {
      console.log('🔄 TypeEntite changé - Réinitialisation du panier');
      this.reinitialiserPanier();
    }
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

    const prixUnitaire = this.getPrixUnitaireSelonTypeEntite(produit);

    const articleGroup = this.fb.group({
      produitId: [produit.id, Validators.required],
      produit: [produit.designation, Validators.required],
      uniteStock: [produit.unite, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prixUnitaire: [prixUnitaire, [Validators.required, Validators.min(0)]],
      //prixUnitaire: [produit.prixVenteUnitaire || produit.prixAchatUnitaire, [Validators.required, Validators.min(0)]],
      prixAchatUnitaire: [produit.prixAchatUnitaire],
      prixVenteUnitaire: [produit.prixVenteUnitaire]
    });
    
    this.panierArray.push(articleGroup);
    // this.addArticleInDB();
    // this.totalPanierChange.emit(this.totalAPayer);
    setTimeout(() => {
    this.addArticleInDB();
});
  }
  addArticleInDB(){
    const article = this.panierArray.at(this.panierArray.length - 1).value as ArticlePanier;
    const  articletosave = {
      ...article,
      panierId: this.panierBrouillon?.id,
      code_structure: this.panierBrouillon?.code_structure,
    }
    
    this.articlesPanierService.create(articletosave).
    pipe(takeUntil(this.destroy$))
    .subscribe({
       next: (article) => {
          console.log('Article enregistré en base');
          /* const updatedPanier = new Panier ({
            totalHT: this.totalPanier,
            totalTTC: this.totalAPayer,
            statut: 'en_cours',
          }); */
          // Mettre à jour le panier en base
          const updatedPanier = {
            totalHT: this.totalPanier,
            tva: this.totalPanier * (this.panierForm.get('tauxTVA')?.value / 100),
            totalTTC: this.totalAPayer,
            statut: 'en_cours'
          } as Panier;

          this.panierService.updatePanier(article.panierId!, updatedPanier)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
              next: (panier) => {
                console.log('Panier mis à jour ', panier);
                const nouveauBrouillon = {
                    ...this.panierBrouillon,
                    ... updatedPanier,
                    //articles: this.preparePanierData().articles // Mettre à jour les articles
                  } as Panier;
                  this.bonBrouillonService.setPanierBrouillon(nouveauBrouillon);
                  this.totalPanierChange.emit(this.totalAPayer);
              },
              error: (err) => {
                console.error('Erreur lors de la mise à jour du panier', err);
              }
          });
          
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout de l`\'article', err);
        }
    })
  }
  // Méthode pour déterminer le prix selon le type d'entité
  private getPrixUnitaireSelonTypeEntite(produit: Produits): number {
    if (this.typeEntite === 'fournisseur') {
      // Pour les fournisseurs, utiliser le prix d'achat
      return produit.prixAchatUnitaire || 0;
    } else {
      // Pour les clients, utiliser le prix de vente
      return produit.prixVenteUnitaire || 0;
    }
  }
  removeArticle(index: number): void {
    const article = this.panierArray.at(index).value;
      console.log('🧾 Tentative de suppression :', article);
    // Si c'est un brouillon existant, supprimer l'article du backend
    if (this.panierBrouillon && this.panierBrouillon.id! > 0 && article.produitId) {
      this.articlesPanierService.deleteArticleFromPanier(
        this.panierBrouillon.id!, 
        article.id
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Article supprimé du backend');
          //this.panierArray.removeAt(index);

          // Recalcul et mise à jour des totaux
          const updatedPanier = {
            totalHT: this.totalPanier,
            tva: this.totalPanier * (this.panierForm.get('tauxTVA')?.value / 100),
            totalTTC: this.totalAPayer,
            statut: 'en_cours'
          } as Panier;

          this.panierService.updatePanier(this.panierBrouillon!.id!, updatedPanier)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (panierMaj) => {
              console.log('Panier mis à jour après suppression:', panierMaj);

              //Actualiser le bon brouillon local
              const nouveauBrouillon = {
                ...this.panierBrouillon,
                ... updatedPanier,
                //articles: this.preparePanierData().articles
              } as Panier;

              this.bonBrouillonService.setPanierBrouillon(nouveauBrouillon);
              this.panierArray.removeAt(index);
              this.totalPanierChange.emit(this.totalAPayer);
              //this.sauvegarderPanierAuto();
            }
          });
          
        },
        error: (err) => {
          console.error('Erreur suppression article:', err);
        }
      });
    }
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
   /*  if (this.panierForm.valid && this.panierArray.length > 0) {
    const panierData: Panier = this.preparePanierData();
    console.log("Depuis panier : ", panierData)
    this.onEnregistrer.emit(panierData);
    } else {
    console.log('typePaiement valide ?', this.panierForm.get('typePaiement')?.valid);
    console.log("Formulaire invalide", this.panierForm.errors, this.panierForm.controls);
    } */
   
      if (this.panierForm.valid && this.panierArray.length > 0) {
        const panierData: Panier = this.preparePanierData();
        this.ispanierValid = true; // Marque le panier comme valide
        this.showBonButtons.emit(true); // Indique d'afficher les boutons du bon
        // désactive après validation
        this.isFormDisabled = true;
        this.panierForm.disable();
        // Sauvegarder dans le service de brouillon
        this.bonBrouillonService.setPanierBrouillon(panierData);
        this.onEnregistrer.emit(panierData);
         

    } 
    else {
       console.log('Formulaire invalide', this.panierForm.controls);
    }
  }
  toggleEdition(): void {
    this.isFormDisabled = !this.isFormDisabled;

    if (this.isFormDisabled) {
      this.panierForm.disable(); // désactive tous les champs
      this.showBonButtons.emit(true);
    } else {
      this.panierForm.enable();  // réactive tous les champs
      this.showBonButtons.emit(false);
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
        // Utiliser le prix unitaire du formulaire (déjà correct selon typeEntite)
        const prixUnitaire = control.get('prixUnitaire')?.value;
        const prixAchatUnitaire = control.get('prixAchatUnitaire')?.value;
        const prixVenteUnitaire = control.get('prixVenteUnitaire')?.value;
        const quantite = control.get('quantite')?.value;

        return new ArticlePanier({
          produit: produit,
          produitId: produit.id!,
          quantite: quantite,
          prixUnitaire: prixUnitaire, // Prix utilisé dans les calculs
          prixAchatUnitaire: prixAchatUnitaire,
          prixVenteUnitaire: prixVenteUnitaire,
          // quantite: control.get('quantite')?.value,
          // prixVenteUnitaire: control.get('prixUnitaire')?.value,
          // prixAchatUnitaire: control.get('prixAchatUnitaire')?.value

        });
      }).filter(article => article !== null) as ArticlePanier[];
      
      const totalHT = articles.reduce((total, article) => {
        return total + (article.quantite * article.prixUnitaire);
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
        tauxTVA: this.panierForm.get('tauxTVA')?.value || 0, 
        remise: remiseValue, 
        avance: avanceValue, 
        totalTTC: totalTTC,
        statut: 'en_cours',
        typeEntite: this.typeEntite
      });
    }
  
  annulerPanier(): void {
    if (this.panierBrouillon) {
      // Supprimer le panier brouillon du backend
      this.panierService.deletePanier(this.panierBrouillon.id!)
        .subscribe({
          next: () => {
            console.log('Panier brouillon supprimé');
          },
          error: (err) => {
            console.error('Erreur suppression panier:', err);
          }
        });
    }
    //this.panierForm.reset();
    //this.panierArray.clear();
    this.reinitialiserPanier();
    this.bonBrouillonService.setPanierBrouillon(null);
    this.onAnnuler.emit();
  }
  
  // resetPanier(): void {
  //   this.panierArray.clear();
  // }
}
