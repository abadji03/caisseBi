import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Produits } from '../../modeles/produit.modele';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ArticlePanier, Panier } from '../../modeles/panier.model';
import { BonBrouillonService } from '../../services/bon-brouillon.service';
import { PaniersService } from '../../services/paniers.service';
import { ArticlesPanierService } from '../../services/articles-panier.service';
import { debounceTime, Subject, takeUntil } from 'rxjs';


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
  @Input() modeCompact = false;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() showButtonsActions = true;
  @Input() showRemiseField = true; 
  @Input() showAvanceField = true; 
  @Input() typeEntite: 'client' | 'fournisseur' = 'client';
  // Ajouter un Input pour la réinitialisation externe
  @Input() resetPanier = false;

  // Dans PanierComponent
  @Input() panierData: Panier | null = null;

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

  private updateSubject$ = new Subject<{article: ArticlePanier, index: number}>();
  //Un Subject pour le debounce TVA

  private panierCharge = false;

  
  private fb = inject(FormBuilder);
  private bonBrouillonService= inject(BonBrouillonService);
  private panierService = inject(PaniersService);
  private articlesPanierService = inject(ArticlesPanierService);
  
  ngOnInit() {
    this.updateTime();
    this.filteredProduits = [...this.produitsDisponibles];
    this.panierForm = this.createPanierForm();

    // S'abonner au panier brouillon
    this.bonBrouillonService.panierBrouillon$.subscribe(panier => {
      this.panierBrouillon = panier;
      
      //NE CHARGER QU'UNE SEULE FOIS
      if (panier && !this.panierCharge) {
        this.chargerPanierBrouillon(panier);
        this.panierCharge = true;
      }
    }); 

    this.panierForm.valueChanges.subscribe(() => {
      this.totalPanierChange.emit(this.totalAPayer);
    });

    this.updateSubject$
    .pipe(
      debounceTime(500), // Attendre 500ms après le dernier changement
      takeUntil(this.destroy$)
    )
    .subscribe(({article}) => {
      this.performArticleUpdate(article);
    });

    //Écouter les changements de inclureTVA
    this.setupTVAChangeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerPanierBrouillon(panier: Panier): void {

    if (this.panierArray.length === 0) {
      panier.ArticlePaniers?.forEach(article => {
        this.ajouterArticleAuForm(article);
      });
    }

    // Charger les paramètres du panier
    this.panierForm.patchValue({
      remise: panier.remise || 0,
      avance: panier.avance || 0,
      //typePaiement: panier.typePaiement || 'caisse',
      tauxTVA:parseInt(panier.tauxTVA .toString(), 10) ||parseInt(this.tauxTVAList[0] .toString(), 10) ,
      //inclureTVA: !!panier.tva
      inclureTVA: panier.tva !== 0 ? !!panier.tva : this.inclureTVA
    });

    this.isFormDisabled = false;
    this.showBonButtons.emit(false);
  } 

  //MÉTHODE POUR ÉCOUTER LES CHANGEMENTS DE TVA
private setupTVAChangeListener(): void {
  this.panierForm.get('inclureTVA')!.valueChanges
    .pipe(
      takeUntil(this.destroy$),
      debounceTime(300) //Attendre 300ms après le dernier changement pour éviter les appels trop fréquents
    )
    .subscribe((inclureTVA) => {
      console.log('Changement TVA:', inclureTVA);
      this.onTVAChange();
    });

    //ÉCOUTEUR POUR LES CHANGEMENTS DE TAUX DE TVA
  this.panierForm.get('tauxTVA')!.valueChanges
    .pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    )
    .subscribe((tauxTVA) => {
      console.log('Changement taux TVA:', tauxTVA);
      if (this.panierForm.get('inclureTVA')?.value) {
        this.onTVAChange();
      }
    });
}

//MÉTHODE APPELÉE QUAND LA TVA CHANGE
private onTVAChange(): void {
  console.log('TVA Change - Début mise à jour', {
    panierId: this.panierBrouillon?.id,
    articlesCount: this.panierArray.length
  });
  if (this.panierBrouillon?.id && this.panierArray.length > 0) {
    
    // Mettre à jour le panier en base de données
    const updatedPanier = this.preparePanierForDB();
    console.log('Données panier pour mise à jour:', updatedPanier);
    this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
  }
  else {
    console.log('Pas de mise à jour: panier vide ou sans ID');
  }
}

// MÉTHODE POUR PRÉPARER LES DONNÉES DU PANIER POUR LA BD
private preparePanierForDB(): Panier {
  const inclureTVA = this.panierForm.get('inclureTVA')?.value;
  const tauxTVA = this.panierForm.get('tauxTVA')?.value || 0;
  
  //SI TVA NON INCLUSE, METTRE tva À 0 ET tauxTVA À 0 OU NULL
  const tvaValue = inclureTVA ? this.totalPanier * (tauxTVA / 100) : 0;
  const tauxTVAValue = inclureTVA ? tauxTVA : 0; // ou null selon votre API

  return {
    totalHT: this.totalPanier,
    tva: tvaValue, // 0 si TVA non incluse
    totalTTC: this.totalAPayer,
    tauxTVA: tauxTVAValue, // 0 si TVA non incluse
    statut: 'en_cours'
  } as Panier;
}
  private performArticleUpdate(article: ArticlePanier): void {
  const articleToUpdate = {
    ...article,
    id: article.id,
    panierId: this.panierBrouillon!.id,
    code_structure: this.panierBrouillon!.code_structure,
  };

  console.log('Mise à jour de l\'article ID:', article.id, articleToUpdate);

  this.articlesPanierService.update(articleToUpdate.id!, articleToUpdate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedArticle) => {
        console.log('Article mis à jour en base');
        const updatedPanier = this.preparePanierForDB(); 
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        this.updatePanierInDB(updatedArticle?.panierId!, updatedPanier);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'article', err);
        // Optionnel: revenir à l'ancienne valeur
      }
    });
}

  private ajouterArticleAuForm(article: ArticlePanier): void {
    const articleGroup = this.fb.group({
      id: [article.id],
      produitId: [article.produitId, Validators.required],
      produit: [article.Produit?.designation, Validators.required],
      uniteStock: [article.Produit?.unite, Validators.required],
      quantite: [parseInt(article.quantite.toString(), 10), [Validators.required, Validators.min(1)]],
      prixUnitaire: [article.prixUnitaire, [Validators.required, Validators.min(0)]],
      prixAchatUnitaire: [article.prixAchatUnitaire],
      prixVenteUnitaire: [article.prixVenteUnitaire]
    });

    this.setupQuantityChangeListener(articleGroup);
    this.panierArray.push(articleGroup);
  } 

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
    
    console.log('Panier réinitialisé');
  }

  // Surveiller les changements de resetPanier
  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetPanier'] && changes['resetPanier'].currentValue === true) {
      this.reinitialiserPanier();
    }

    // Réagir aux changements de typeEntite
    if (changes['typeEntite']) {
      console.log('TypeEntite changé - Réinitialisation du panier');
      this.reinitialiserPanier();
    }
    // Charger les données du panier si elles sont fournies
    if (changes['panierData'] && this.panierData && this.panierData.articles) {
      this.chargerPanierExistant(this.panierData);
    }
  }

  // Nouvelle méthode pour charger un panier existant
private chargerPanierExistant(panier: Panier): void {
  console.log('Chargement du panier existant:', panier.articles?.length);
  
  // Réinitialiser d'abord le panier
  this.panierArray.clear();
  
  // Charger les articles
  panier.articles?.forEach(article => {
    this.ajouterArticleAuForm(article);
  });
  
  // Charger les paramètres
  this.panierForm.patchValue({
    remise: panier.remise || 0,
    avance: panier.avance || 0,
    tauxTVA: panier.tauxTVA || this.tauxTVAList[0] || 0,
    inclureTVA: !!panier.tva
  });
  
  // Mettre à jour le statut
  this.isFormDisabled = panier.statut === 'validé';
  if (this.isFormDisabled) {
    this.panierForm.disable();
  } else {
    this.panierForm.enable();
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
      // Vérifier si le produit existe déjà dans le panier
      const existingArticleIndex = this.findExistingArticleIndex(produit.id!);
      
      if (existingArticleIndex !== -1) {
        // Produit existe déjà : augmenter la quantité
        this.incrementQuantity(existingArticleIndex);
      } 
      else {
        // Nouveau produit : ajouter en haut du panier
        const index = this.addNewArticleAtTop(produit);
        //this.addArticleInDB(index);
        //S'assurer que le panier brouillon existe avant d'ajouter en DB
        if (this.panierBrouillon?.id) {
          this.addArticleInDB(index);
        } else {
          console.warn('Panier brouillon non disponible pour sauvegarde DB');
        }
      }
  }

// Trouver l'index d'un article existant
private findExistingArticleIndex(produitId: number): number {
  return this.panierArray.controls.findIndex(control => 
    control.get('produitId')?.value === produitId
  );
}

// Augmenter la quantité d'un article existant
private incrementQuantity(index: number): void {
  const articleGroup = this.panierArray.at(index);
  const currentQuantity = articleGroup.get('quantite')?.value || 0;
  //DÉSACTIVER TEMPORAIREMENT L'ÉCOUTEUR POUR ÉVITER LES BOUCLES
  articleGroup.get('quantite')?.disable({ emitEvent: false });

  articleGroup.patchValue({
    quantite: currentQuantity + 1
  }, { emitEvent: false });
  
  //RÉACTIVER L'ÉCOUTEUR
  articleGroup.get('quantite')?.enable({ emitEvent: false });
  // Mettre à jour en base de données
  this.updateArticleInDB(articleGroup.value, index);
}

// Méthode utilitaire pour le débogage
private debugArticleState(articleGroup: FormGroup, message: string): void {
  console.log(`🔍 ${message}:`, {
    id: articleGroup.get('id')?.value,
    produit: articleGroup.get('produit')?.value,
    hasIdControl: !!articleGroup.get('id'),
    formGroupKeys: Object.keys(articleGroup.controls)
  });
}
// Ajouter un nouveau produit en haut du panier
private addNewArticleAtTop(produit: Produits): number {
  const prixUnitaire = this.getPrixUnitaireSelonTypeEntite(produit);

  const articleGroup = this.fb.group({
     id: [null], //INITIALISÉ À null
    produitId: [produit.id, Validators.required],
    produit: [produit.designation, Validators.required],
    uniteStock: [produit.unite, Validators.required],
    quantite: [1, [Validators.required, Validators.min(1)]],
    prixUnitaire: [prixUnitaire, [Validators.required, Validators.min(0)]],
    prixAchatUnitaire: [produit.prixAchatUnitaire],
    prixVenteUnitaire: [produit.prixVenteUnitaire]
  });

  this.setupQuantityChangeListener(articleGroup);
  // Insérer en position 0 (haut du panier)
  this.panierArray.insert(0, articleGroup);
  return 0;
}

//Configurer l'écouteur de changement de quantité
private setupQuantityChangeListener(articleGroup: FormGroup): void {
  

  console.log('🔔 Configuration écouteur pour article:', articleGroup.get('produit')?.value);

  articleGroup.get('quantite')!.valueChanges
    .pipe(
      takeUntil(this.destroy$),
      //debounceTime(500)
    )
    .subscribe((newQuantity) => {
      console.log('Changement quantité:', {
        produit: articleGroup.get('produit')?.value,
        nouvelleQuantité: newQuantity,
        aUnID: !!articleGroup.get('id')?.value
      });
      // Ne mettre à jour en base que si l'article a un ID (déjà sauvegardé)
      if (articleGroup.get('id')?.value && this.panierBrouillon?.id) {
        const index = this.panierArray.controls.indexOf(articleGroup);
        console.log('Appel updateArticleInDB, index:', index);
        if (index !== -1) {
          this.updateArticleInDB((articleGroup.value as ArticlePanier), index);
        }
      }
      else {
        console.log('Article sans ID - pas de mise à jour DB');
      }
    });
}

private canUpdateInDB(): boolean {
  return !!(this.panierBrouillon?.id && this.panierArray.length > 0);
}
private updateArticleInDB(article: ArticlePanier, index: number): void {

  if (!this.canUpdateInDB()|| !article.id) {
    console.warn('Impossible de mettre à jour: ID manquant', {
      panierId: this.panierBrouillon?.id,
      articleId: article.id,
      canUpdate: this.canUpdateInDB()
    });
    return;
  }

  const articleToUpdate = {
    ...article,
    id: article.id,
    panierId: this.panierBrouillon?.id,
    code_structure: this.panierBrouillon?.code_structure,
  };

  console.log('Mise à jour de l\'article ID:', article.id, articleToUpdate);

  this.articlesPanierService.update(articleToUpdate.id,articleToUpdate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedArticle) => {
        console.log('Article mis à jour en base');
        const updatedPanier = this.preparePanierForDB(); 
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        this.updatePanierInDB(updatedArticle?.panierId!,updatedPanier);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'article', err);
        // Revenir à l'ancienne quantité en cas d'erreur
        const articleGroup = this.panierArray.at(index);
        const currentQuantity = articleGroup.get('quantite')?.value || 0;
        articleGroup.patchValue({
          quantite: Math.max(1, currentQuantity)
        });
      }
    });

    this.updateSubject$.next({article, index});
}

private updatePanierInDB(panierId:number, updatedPanier:Panier): void {
  if (!this.panierBrouillon?.id) return;

  this.panierService.updatePanier(panierId, updatedPanier)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (panier) => {
        console.log('Panier mis à jour ', panier);
        this.totalPanierChange.emit(this.totalAPayer);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du panier', err);
      }
    });
}

  addArticleInDB(index: number){

    if (this.panierArray.length === 0 || !this.panierBrouillon?.id) {
      console.warn('Impossible d\'ajouter l\'article: panier vide ou non initialisé');
      return;
    }
    const articleGroup = this.panierArray.at(index) as FormGroup;
    const article = this.panierArray.at(index).value as ArticlePanier;

    //S'assurer que le FormGroup a bien un contrôle 'id'
    if (!articleGroup.get('id')) {
      console.error('Le FormGroup n\'a pas de contrôle "id"');
      articleGroup.addControl('id', this.fb.control(null));
    }
    const  articletosave = {
      ...article,
      panierId: this.panierBrouillon?.id,
      code_structure: this.panierBrouillon?.code_structure,
    }
    
    console.log('🟡 Données à sauvegarder:', articletosave);
    this.articlesPanierService.create(articletosave).
    pipe(takeUntil(this.destroy$))
    .subscribe({
       next: (articleSaved) => {
          console.log('✅ Article enregistré en base, ID reçu:', articleSaved.id);

          // Mettre à jour le contrôle 'id' du FormGroup avec l'ID reçu
          //patchValue avec emitEvent: false
          articleGroup.patchValue({
            id: articleSaved.id
          }, { emitEvent: false });
          
          // 🔥 FORCER la détection du changement si nécessaire
          articleGroup.markAsDirty();
          
          // Vérification immédiate
          const verifiedId = articleGroup.get('id')?.value;
          console.log('Vérification ID après assignation:', verifiedId);
          
          if (!verifiedId) {
            console.error('ÉCHEC: L\'ID n\'a pas été assigné au FormGroup');
            return;
          }
          
          console.log('SUCCÈS: Article mis à jour avec ID:', verifiedId);

          // Mettre à jour le panier en base
          const updatedPanier = this.preparePanierForDB();
          this.updatePanierInDB(articleSaved.panierId!, updatedPanier)
          
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout de l`\'article', err);
          //this.panierArray.removeAt(0);
          this.panierArray.removeAt(index);
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
    const article = this.panierArray.at(index).value as ArticlePanier;;
      console.log('Tentative de suppression :', article);

    // Si c'est un brouillon existant, supprimer l'article du backend
    if (this.panierBrouillon && article.id) {
      this.articlesPanierService.deleteArticleFromPanier(
        this.panierBrouillon.id!, 
        article.id
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Article supprimé du backend');
          //this.panierArray.removeAt(index);
          this.panierArray.removeAt(index);
          // Recalcul et mise à jour des totaux
          const updatedPanier = this.preparePanierForDB(); 
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          this.updatePanierInDB(this.panierBrouillon?.id!, updatedPanier)
         
        },
        error: (err) => {
          console.error('Erreur suppression article:', err.message);
        }
      });
    }
    else {
    // Fallback: suppression locale seulement si pas d'ID
    console.log('⚠️ Suppression locale seulement (pas d\'ID)');
    this.panierArray.removeAt(index);
    if (this.panierBrouillon?.id) {
      const updatedPanier = this.preparePanierForDB(); 
      this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
    }
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
    if (this.panierBrouillon?.id && this.panierArray.length > 0) {
      const updatedPanier = this.preparePanierForDB(); 
      this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
    }

  }
  
  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }
  
  enregistrerPanier(): void {

      if (this.panierForm.valid && this.panierArray.length > 0) {
        const panierData: Panier = this.preparePanierData();
        this.ispanierValid = true; // Marque le panier comme valide
        this.showBonButtons.emit(true); // Indique d'afficher les boutons du bon
        // désactive après validation
        this.isFormDisabled = true;
        this.panierForm.disable();
        // Sauvegarder dans le service de brouillon
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
      const panierData: Panier = this.preparePanierForDB();
      this.updatePanierInDB(this.panierBrouillon!.id!, panierData);
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
        });
      }).filter(article => article !== null) as ArticlePanier[];
      
      const statutFinal = 'validé';
      const totalHT = articles.reduce((total, article) => {
        return total + (article.quantite * article.prixUnitaire);
      }, 0);
      
      
      const inclureTVA = this.panierForm.get('inclureTVA')?.value;
      const tauxTVA = this.panierForm.get('tauxTVA')?.value || 0;
      const tvaValue = inclureTVA?.value ? totalHT * (tauxTVA / 100) : 0;
      const tauxTVAValue = inclureTVA ? tauxTVA : 0;
      
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
        tauxTVA: tauxTVAValue, 
        remise: remiseValue, 
        avance: avanceValue, 
        totalTTC: totalTTC,
        statut: statutFinal,
        typeEntite: this.typeEntite
      });
    }
  
  annulerPanier(): void {
    const confirmation = confirm('Annuler le panier ?');
    if (confirmation) {
       if (this.panierBrouillon) {
      // Supprimer le panier brouillon du backend
      this.panierService.deletePanier(this.panierBrouillon.id!)
        .subscribe({
          next: () => {
            console.log('Panier brouillon supprimé');
            this.reinitialiserPanier();
            this.bonBrouillonService.setPanierBrouillon(null);
            this.onAnnuler.emit();
          },
          error: (err) => {
            console.error('Erreur suppression panier:', err);
          }
        });
    }
    } else {
      console.log('Action annulée');
    }
   
  }
  

}
