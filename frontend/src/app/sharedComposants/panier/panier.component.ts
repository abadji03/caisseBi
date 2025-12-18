import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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

  @Input() tvaParArticle = true; // Nouveau: contrôle si TVA par article
  @Input() remiseParArticle = true; // Nouveau: contrôle si remise par article

  isFormDisabled = false; // false par défaut
  ispanierValid = false; // Pour suivre la validité du panier
  showTVAFields = false; // Contrôle l'affichage des colonnes TVA
  showRemiseFields = false; // Contrôle l'affichage des colonnes Remise
  tvaRadioValue: 'article' | 'global' = 'article'; // Valeur du radio button TVA
  remiseRadioValue: 'article' | 'global' = 'global'; // Valeur du radio button Remise

  private destroy$ = new Subject<void>();

  // Dans la classe PanierComponent
  _uid = Math.random().toString(36).substr(2, 9);


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

  private alreadyLoadedPanierId: number | null = null;

  panierBrouillon: Panier | null = null;

  private updateSubject$ = new Subject<{article: ArticlePanier, index: number}>();
  //Un Subject pour le debounce TVA

  private panierCharge = false;

  
  private fb = inject(FormBuilder);
  private bonBrouillonService= inject(BonBrouillonService);
  private panierService = inject(PaniersService);
  private articlesPanierService = inject(ArticlesPanierService);
  private cdr = inject(ChangeDetectorRef);
  
  
  ngOnInit() {
    this.panierForm = this.createPanierForm();
    this.updateTime();
    this.filteredProduits = [...this.produitsDisponibles];

    // Déterminer le mode TVA automatiquement
    this.tvaParArticle = this.determineTVAMode();

    // Initialiser les radios selon les inputs
    //this.tvaRadioValue = this.tvaParArticle ? 'article' : 'global';
    //this.remiseRadioValue = this.remiseParArticle ? 'article' : 'global';

    // Initialiser l'affichage des colonnes
    this.showTVAFields = this.tvaParArticle;
    this.showRemiseFields = this.remiseParArticle;

    // Mettre à jour le formulaire avec les valeurs initiales
    this.panierForm.patchValue({
      tvaParArticle: this.tvaParArticle,
      remiseParArticle: this.remiseParArticle,
      tauxTVAGlobal: this.tauxTVAList[0] || 0
    });

    /* Sync radios depuis le FormGroup */
    this.panierForm.get('tvaParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.tvaRadioValue = v ? 'article' : 'global');

    this.panierForm.get('remiseParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.remiseRadioValue = v ? 'article' : 'global');

     // Écouter les changements du formulaire pour forcer les recalculs
    this.panierForm.valueChanges
    .pipe(
      takeUntil(this.destroy$),
      debounceTime(100)
    )
    .subscribe(() => {
      // Quand le formulaire change, recalculer les totaux globaux
      this.updateTotauxGlobaux();
      this.cdr.detectChanges();
    });

    setTimeout(() => {
    this.bonBrouillonService.panierBrouillon$.subscribe(panier => {
      this.panierBrouillon = panier;
      
      // NE CHARGER QU'UNE SEULE FOIS
      if (panier && !this.panierCharge) {
        this.chargerPanierBrouillon(panier);
        this.panierCharge = true;
      }
    });
  }, 100);

    /* this.panierForm.valueChanges.subscribe(() => {
      this.totalPanierChange.emit(this.totalAPayer);
    }); */

    this.panierArray.valueChanges
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        this.panierArray.controls.forEach(a => this.calculerTotauxArticle(a));
        this.totalPanierChange.emit(this.totalAPayer);
      });
    
    /* this.updateSubject$
    .pipe(
      debounceTime(500), // Attendre 500ms après le dernier changement
      takeUntil(this.destroy$)
    )
    .subscribe(({article}) => {
      this.performArticleUpdate(article);
    }); */

    //Écouter les changements de inclureTVA
    //this.setupTVAChangeListener();
    //this.setupTVARemiseChangeListeners()
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerPanierBrouillon(panier: Panier): void {
    console.log('Chargement panier brouillon:', panier);

    if (panier) {
      this.chargerPanierExistant(panier);
    } 

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

    // Méthode pour préparer les données du panier pour la base
  private preparePanierForDB(): Panier {
    const articles: ArticlePanier[] = this.panierArray.controls.map(control => {
      const values = control.value;
      return new ArticlePanier({
        id: values.id,
        produitId: values.produitId,
        quantite: values.quantite,
        prixUnitaire: values.prixUnitaire,
        prixAchatUnitaire: values.prixAchatUnitaire,
        prixVenteUnitaire: values.prixVenteUnitaire,
        tauxTVA: values.tauxTVA,
        remise: values.remise,
        totalHT: values.totalHT,
        montantRemise: values.montantRemise,
        montantTVA: values.montantTVA,
        totalTTC: values.totalTTC
      });
    });

    const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
    const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
    //const inclureTVA = this.panierForm.get('inclureTVA')?.value;

    return new Panier({
      articles: articles,
      totalHT: this.totalPanier,
      tva: this.panierArray.controls.reduce((sum, article) => 
        sum + (article.get('montantTVA')?.value || 0), 0),
      totalTTC: this.totalAPayer,
      remiseGlobale: remiseParArticle ? 0 : (this.panierForm.get('remiseGlobale')?.value || 0),
      avance: this.panierForm.get('avance')?.value || 0,
      tauxTVA: tvaParArticle ? 0 : (this.panierForm.get('tauxTVAGlobal')?.value || 0),
      typeEntite: this.typeEntite,
      statut: 'en_cours',
      remiseParArticle: remiseParArticle,
      tvaParArticle: tvaParArticle
    });
  }

  private performArticleUpdate(article: ArticlePanier): void {
 
  const articleToUpdate = new ArticlePanier({
    id: article.id,
    panierId: this.panierBrouillon?.id,
    code_structure: this.panierBrouillon?.code_structure,
    produitId: article.produitId,
    produit: article.produit || article.Produit,
    prixUnitaire: article.prixUnitaire,
    quantite: article.quantite,
    prixVenteUnitaire: article.prixVenteUnitaire,
    prixAchatUnitaire: article.prixAchatUnitaire,
    stock: article.stock,
    remise: article.remise || 0,
    tauxTVA: article.tauxTVA || 0,
    montantTVA: article.montantTVA || 0,
    montantRemise: article.montantRemise || 0,
    totalHT: article.totalHT || 0,
    totalTTC: article.totalTTC || 0
  });

  console.log('Mise à jour de l\'article ID dans performeArticleInDB:', article.id, articleToUpdate);

  this.articlesPanierService.update(articleToUpdate.id!, articleToUpdate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedArticle) => {
        console.log('Article mis à jour en base dans performeArticleInDB');
        const updatedPanier = this.preparePanierForDB(); 
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        this.updatePanierInDB(updatedArticle?.panierId!, updatedPanier);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'article dans performeArticleInDB', err);
        // Optionnel: revenir à l'ancienne valeur
      }
    });
}

  private ajouterArticleAuForm(article: ArticlePanier): void {
    console.log('Ajout article au form:', {
      id: article.id,
      produit: article.produit?.designation,
      totalHT: article.totalHT,
      totalTTC: article.totalTTC,
      montantTVA: article.montantTVA
    });
    // Vérifier si les totaux doivent être recalculés
  const needsRecalculation = !article.totalHT || article.totalHT === 0 || 
                            !article.totalTTC || article.totalTTC === 0;

    
    const articleGroup = this.fb.group({
    id: [article.id],
    produitId: [article.produitId, Validators.required],
    produit: [article.produit?.designation || article.Produit?.designation, Validators.required],
    uniteStock: [article.produit?.unite || article.Produit?.unite, Validators.required],
    quantite: [parseInt(article.quantite.toString(), 10), [Validators.required, Validators.min(1)]],
    prixUnitaire: [article.prixUnitaire, [Validators.required, Validators.min(0)]],
    prixAchatUnitaire: [article.prixAchatUnitaire || article.produit?.prixAchatUnitaire],
    prixVenteUnitaire: [article.prixVenteUnitaire || article.produit?.prixVenteUnitaire],
// Dans ajouterArticleAuForm, remplacer la ligne tauxTVA par :
    tauxTVA: [
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      Number(article.tauxTVA )|| this.getTauxTVADefault(article.produitId || article.produit?.id || article.Produit?.id!) || 0,
      [Validators.min(0), Validators.max(100)]
    ],    
    remise: [article.remise || 0, [Validators.min(0), Validators.max(100)]],
    totalHT: [article.totalHT || 0],
    montantRemise: [article.montantRemise || 0],
    montantTVA: [article.montantTVA || 0],
    totalTTC: [article.totalTTC || 0]
  });

    // Si les totaux sont manquants, les calculer
    if (needsRecalculation) {
      console.log('Recalcul des totaux pour l\'article:', article.produit?.designation);
      this.calculerTotauxArticle(articleGroup);
    }

    this.setupQuantityChangeListener(articleGroup);
    this.panierArray.push(articleGroup);

    console.log('Article ajouté, totaux:', {
      totalHT: articleGroup.get('totalHT')?.value,
      totalTTC: articleGroup.get('totalTTC')?.value,
      montantTVA: articleGroup.get('montantTVA')?.value
    });

  } 

  createPanierForm(): FormGroup {
    return this.fb.group({
      remiseGlobale: [0, [Validators.min(0), Validators.max(100)]],
      avance: [0, [Validators.min(0)]],
      typePaiement: ['caisse', Validators.required],
      tauxTVAGlobal: [this.tauxTVAList[0] || 0],
      tvaParArticle: [this.tvaParArticle],
      remiseParArticle: [this.remiseParArticle],
      panier: this.fb.array([])
    });
  }

  // Ajouter une méthode de réinitialisation
  reinitialiserPanier(): void {

    // Vérifier que panierForm existe
  if (!this.panierForm) {
    console.log('Formulaire non encore initialisé, réinitialisation ignorée');
    return;
  }
    this.panierForm.reset({
      remise: 0,
      avance: 0,
      typePaiement: 'caisse',
      tauxTVA: this.tauxTVAList[0] || 0,
    });
    
    this.panierArray.clear();
    this.searchInput = '';
    this.filteredProduits = [];
    this.isFormDisabled = false;
    this.ispanierValid = false;
    this.alreadyLoadedPanierId = null; // Réinitialiser

    // Réactiver tous les contrôles
    this.enableFormControls();
    
    // Réactiver le formulaire
    //this.panierForm.enable();
    // Émettre le changement de total
    this.showBonButtons.emit(false);
    this.totalPanierChange.emit(0);
    
    console.log('Panier réinitialisé');
  }

  // Surveiller les changements de resetPanier
  ngOnChanges(changes: SimpleChanges) {
    // Si le formulaire n'est pas encore créé, ignorer les changements
  
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
      //this.chargerPanierExistant(this.panierData);
        if (!this.isFormDisabled) {
      this.chargerPanierExistant(this.panierData);
    }
    }
     // Mettre à jour les radios si les inputs changent
    if (changes['tvaParArticle']) {
      this.tvaRadioValue = this.tvaParArticle ? 'article' : 'global';
    }

    if (changes['remiseParArticle']) {
      this.remiseRadioValue = this.remiseParArticle ? 'article' : 'global';
    }
  }

  // Nouvelle méthode pour charger un panier existant
private chargerPanierExistant(panier: Panier): void {
  console.log('Chargement du panier existant:', panier);

  if (this.panierCharge) {
    console.log('Panier déjà chargé, ignorer');
    return;
  }

  console.log('Chargement du panier existant:', panier);
  // Éviter le rechargement du même panier
  if (panier.id && panier.id === this.alreadyLoadedPanierId) {
    console.log('Panier déjà chargé, id:', panier.id);
    return;
  } 
  // Réinitialiser d'abord le panier
  this.panierArray.clear();
  this.alreadyLoadedPanierId = panier.id || null;
  this.panierCharge = true;
  console.log('Panier réinitialiser avec succès');

  // Charger les articles
  if (panier.ArticlePaniers && panier.ArticlePaniers?.length > 0) {
    console.log('Articles à charger:', panier.ArticlePaniers?.length);
    panier.ArticlePaniers.forEach((article, index) => {
      console.log(`Article ${index}:`, {
        id: article.id,
        produit: article.produit?.designation,
        quantite: article.quantite,
        prixUnitaire: article.prixUnitaire,
        tauxTVA: article.tauxTVA,
        remise: article.remise,
        totalHT: article.totalHT,
        totalTTC: article.totalTTC
      });
      console.log('Article à ajouté au panier', article);
      this.ajouterArticleAuForm(article);
    });
  }

  this.panierForm.patchValue({
    remiseGlobale: panier.remiseGlobale || 0,
    avance: panier.avance || 0,
    tauxTVAGlobal: panier.tauxTVA || this.tauxTVAList[0] || 0,
    tvaParArticle: panier.tvaParArticle !== undefined ? panier.tvaParArticle : true,
    remiseParArticle: panier.remiseParArticle !== undefined ? panier.remiseParArticle : false,
    //inclureTVA: (panier.tva && panier.tva > 0) || this.inclureTVA
  });
  
  // Mettre à jour les flags de mode
  this.tvaParArticle = panier.tvaParArticle !== undefined ? panier.tvaParArticle : true;
  this.remiseParArticle = panier.remiseParArticle !== undefined ? panier.remiseParArticle : false;
  
  // Mettre à jour l'état des champs selon les modes
  this.updateFieldStatesBasedOnModes();
  
  // Recalculer les totaux pour chaque article
  this.recalculerTotauxArticles();
  
  // Mettre à jour les totaux généraux
  this.updatePanierTotals();
  
  // Mettre à jour le statut
  this.isFormDisabled = panier.statut === 'validé';

   // Appliquer l'état d'activation/désactivation selon le statut
  if (this.isFormDisabled) {
    this.disableFormControls();
    this.showBonButtons.emit(true);
  } else {
    this.enableFormControls();
    this.showBonButtons.emit(false);
  }

  // Stocker l'ID du panier pour référence
  if (panier.id) {
    this.panierBrouillon = panier;
    //this.alreadyLoadedPanierId = panier.id;
  }
   this.totalPanierChange.emit(this.totalPanier)
  //console.log('Panier chargé, isFormDisabled:', this.isFormDisabled);
  console.log('Panier chargé, totaux:', {
    totalHT: this.totalPanier,
    totalTTC: this.totalAPayer,
    //tva: this.montantTVA
  });

}
  get panierArray(): FormArray<FormGroup> {
    return this.panierForm.get('panier') as FormArray<FormGroup>;
  }

  
  get totalPanier(): number {
    
    return this.panierArray.controls.reduce(
      (s, a) => s + this.n(a, 'totalHT'),
      0
    );
    /* return this.panierArray.controls.reduce((total, article) => {
      return total + (article.get('totalHT')?.value || 0);
    }, 0); */
    /*  return this.panierArray.controls.reduce(
    (s, a) => s + (a.get('totalHT')?.value || 0),
    0
  ); */
  }


  get montantTVA(): number {
  /* const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
  const tauxTVAGlobal = this.panierForm.get('tauxTVAGlobal')?.value || 0;
  const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  const remiseGlobale = this.panierForm.get('remiseGlobale')?.value || 0;

  // Calcul du total HT après remises
  let totalHTApresRemises = this.totalPanier;

   // Appliquer la remise globale si en mode global
  if (!remiseParArticle && remiseGlobale > 0) {
    totalHTApresRemises = totalHTApresRemises * (1 - (remiseGlobale / 100));
  }
  if (tvaParArticle) {
    // TVA par article - sommer les TVA déjà calculées par article
    return this.panierArray.controls.reduce((total, article) => {
      return total + (article.get('montantTVA')?.value || 0);
    }, 0);
  } else {
    // TVA globale - calculer sur le total HT après remises
    return totalHTApresRemises * (tauxTVAGlobal / 100);
  } */
  if (this.panierForm.get('tvaParArticle')?.value) {
      return this.panierArray.controls.reduce(
        (s, a) => s + this.n(a, 'montantTVA'),
        0
      );
    }

    const taux = this.panierForm.get('tauxTVAGlobal')?.value || 0;
    return (this.totalPanier - this.montantRemise) * taux / 100;
}

get montantRemise(): number {
  /* const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  const remiseGlobale = this.panierForm.get('remiseGlobale')?.value || 0;
  
  if (remiseParArticle) {
    // Remise par article - sommer les remises déjà calculées par article
    return this.panierArray.controls.reduce((total, article) => {
      return total + (article.get('montantRemise')?.value || 0);
    }, 0);
  } else {
    // Remise globale - calculer sur le total HT
    return this.totalPanier * (remiseGlobale / 100);
  } */
  if (this.panierForm.get('remiseParArticle')?.value) {
      return this.panierArray.controls.reduce(
        (s, a) => s + this.n(a, 'montantRemise'),
        0
      );
    }

    const taux = this.panierForm.get('remiseGlobale')?.value || 0;
    return this.totalPanier * taux / 100;

}


  get totalAPayer(): number {
  /* let total = this.totalPanier;
  
  // Appliquer les remises
  total -= this.montantRemise;
  
  // Appliquer les TVA
  total += this.montantTVA;
  
  return Math.max(0, total); */
  return this.totalPanier - this.montantRemise + this.montantTVA;
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

  canActivateTvaGlobalMode(): boolean {
  return this.panierArray.controls.some(articleGroup => {
    const tauxTVA = articleGroup.get('tauxTVA')?.value;
    return tauxTVA && tauxTVA > 0;
  });
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
  const tauxTVAProduit = produit.tauxTVA || 0;

  const articleGroup = this.fb.group({
     id: [null], //INITIALISÉ À null
    produitId: [produit.id, Validators.required],
    produit: [produit.designation, Validators.required],
    uniteStock: [produit.unite, Validators.required],
    quantite: [1, [Validators.required, Validators.min(1)]],
    prixUnitaire: [prixUnitaire, [Validators.required, Validators.min(0)]],
    prixAchatUnitaire: [produit.prixAchatUnitaire],
    prixVenteUnitaire: [produit.prixVenteUnitaire],
    tauxTVA: [tauxTVAProduit, [Validators.min(0), Validators.max(100)]],
    remise: [0, [Validators.min(0), Validators.max(100)]],
    totalHT: [0],
    montantRemise: [0],
    montantTVA: [0],
    totalTTC: [0]
  });

  // Activer/désactiver les champs selon le mode
    if (!this.panierForm.get('tvaParArticle')?.value) {
      articleGroup.get('tauxTVA')?.disable();
    }
    
    if (!this.panierForm.get('remiseParArticle')?.value) {
      articleGroup.get('remise')?.disable();
    }
  //this.setupQuantityChangeListener(articleGroup);
  this.setupArticleChangeListeners(articleGroup);
  // Insérer en position 0 (haut du panier)
  this.panierArray.insert(0, articleGroup);
  // Calculer les totaux initiaux
  this.calculerTotauxArticle(articleGroup);
  return 0;
}
 // Configuration des écouteurs pour un article
  private setupArticleChangeListeners(articleGroup: FormGroup): void {
    // Écouteur pour la quantité
    articleGroup.get('quantite')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.onArticleChange(articleGroup);
      });

    // Écouteur pour le prix unitaire
    articleGroup.get('prixUnitaire')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.onArticleChange(articleGroup);
      });

    // Écouteur pour la remise de l'article
    articleGroup.get('remise')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        if (this.panierForm.get('remiseParArticle')?.value) {
          this.onArticleChange(articleGroup);
        }
         else {
        // Même en mode global, on doit recalculer l'article
        this.onArticleChange(articleGroup);
      }
      });

    // Écouteur pour la TVA de l'article
    articleGroup.get('tauxTVA')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        if (this.panierForm.get('tvaParArticle')?.value && this.panierForm.get('inclureTVA')?.value) {
          this.onArticleChange(articleGroup);
        }
         else {
        // Même en mode global, on doit recalculer l'article
        this.onArticleChange(articleGroup);
      }
      });
  }

  private onArticleChange(articleGroup: FormGroup): void {
    this.calculerTotauxArticle(articleGroup);
    
    const index = this.panierArray.controls.indexOf(articleGroup);
    const article = articleGroup.value as ArticlePanier;
    
    if (article.id && this.panierBrouillon?.id) {
      this.updateSubject$.next({ article, index });
    }
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

  const articleToUpdate = new ArticlePanier({
    id: article.id,
    panierId: this.panierBrouillon?.id,
    code_structure: this.panierBrouillon?.code_structure,
    produitId: article.produitId,
    produit: article.produit || article.Produit,
    prixUnitaire: article.prixUnitaire,
    quantite: article.quantite,
    prixVenteUnitaire: article.prixVenteUnitaire,
    prixAchatUnitaire: article.prixAchatUnitaire,
    stock: article.stock,
    remise: article.remise || 0,
    tauxTVA: article.tauxTVA || 0,
    montantTVA: article.montantTVA || 0,
    montantRemise: article.montantRemise || 0,
    totalHT: article.totalHT || 0,
    totalTTC: article.totalTTC || 0
  });


  console.log('Mise à jour de l\'article ID:', article.id, articleToUpdate);

  this.articlesPanierService.update(articleToUpdate.id!,articleToUpdate)
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
  if (!this.panierBrouillon?.id) {
    console.log('Aucun panier brouillon à mettre à jour');
    return;
  }
  console.log('ID panier à mettre à jour',this.panierBrouillon.id)
  this.panierService.updatePanier(panierId, updatedPanier)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (panier) => {
        console.log('Panier mis à jour ', panier);
        this.totalPanierChange.emit(this.totalAPayer);
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Erreur lors de la mise du panier';
        console.error('Erreur lors de la mise à jour du panier', errorMessage);
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
  
   const articletosave = new ArticlePanier({
    id: article.id,
    panierId: this.panierBrouillon?.id,
    code_structure: this.panierBrouillon?.code_structure,
    produitId: article.produitId,
    produit: article.produit || article.Produit,
    prixUnitaire: article.prixUnitaire,
    quantite: article.quantite,
    prixVenteUnitaire: article.prixVenteUnitaire,
    prixAchatUnitaire: article.prixAchatUnitaire,
    stock: article.stock,
    remise: article.remise || 0,
    tauxTVA: article.tauxTVA || 0,
    montantTVA: article.montantTVA || 0,
    montantRemise: article.montantRemise || 0,
    totalHT: article.totalHT || 0,
    totalTTC: article.totalTTC || 0
  });
    
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
          console.log('ID panier à mettre à jour dans updateArticleInDB', articleSaved.panierId!);
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

        // IMPORTANT : Désactiver les contrôles mais garder les valeurs visibles
        this.disableFormControls();

      // Émettre les événements
        this.showBonButtons.emit(true); // Indique d'afficher les boutons du bon
        this.onEnregistrer.emit(panierData);

    } 
    else {
       console.log('Formulaire invalide', this.panierForm.controls);
    }
  }

  private disableFormControls(): void {
    // Désactiver tous les contrôles sauf les champs readonly
    this.panierArray.controls.forEach(control => {
      // Garder les champs produit et uniteStock activés (readonly)
      control.get('quantite')?.disable();
      control.get('prixUnitaire')?.disable();
    });
    
    // Désactiver les autres champs du formulaire
    this.panierForm.get('remise')?.disable();
    this.panierForm.get('avance')?.disable();
    this.panierForm.get('tauxTVA')?.disable();
    this.panierForm.get('inclureTVA')?.disable();
    this.panierForm.get('typePaiement')?.disable();
    
    this.isFormDisabled = true;
  }

  private enableFormControls(): void {
  // Réactiver tous les contrôles
  this.panierArray.controls.forEach(control => {
    control.get('quantite')?.enable();
    control.get('prixUnitaire')?.enable();
  });
  
  // Réactiver les autres champs
  this.panierForm.get('remise')?.enable();
  this.panierForm.get('avance')?.enable();
  this.panierForm.get('tauxTVA')?.enable();
  this.panierForm.get('inclureTVA')?.enable();
  this.panierForm.get('typePaiement')?.enable();
  
  this.isFormDisabled = false;
}
 
  toggleEdition(): void {
  if (this.isFormDisabled) {
    // Passer en mode édition (activer les champs)
    this.enableFormControls();
    this.showBonButtons.emit(false);
  } else {
    // Passer en mode validation (désactiver les champs)
    this.disableFormControls();
    this.showBonButtons.emit(true);
    
    // Mettre à jour le panier en base si nécessaire
    if (this.panierBrouillon?.id) {
      const panierData: Panier = this.preparePanierForDB();
      this.updatePanierInDB(this.panierBrouillon.id, panierData);
    }
  }
}

  onEditOrSave() {
      if (this.isFormDisabled) {
        this.toggleEdition();  // Activer le formulaire
      } else {
        this.enregistrerPanier(); // Valider le panier
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
  //...........................................................................

    // Configuration des écouteurs pour TVA et remise
  private setupTVARemiseChangeListeners(): void {
    // Écouteur pour le changement de mode TVA
    this.panierForm.get('tvaParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((tvaParArticle) => {
        console.log('Mode TVA changé:', tvaParArticle);
        this.onTVAModeChange(tvaParArticle);
      });

    // Écouteur pour le changement de mode remise
    this.panierForm.get('remiseParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((remiseParArticle) => {
        console.log('Mode remise changé:', remiseParArticle);
        this.onRemiseModeChange(remiseParArticle);
      });

    // Écouteur pour le taux de TVA global
    this.panierForm.get('tauxTVAGlobal')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((tauxTVA) => {
        console.log('Changement tauxTVAGlobal:', tauxTVA);  
        if (!this.panierForm.get('tvaParArticle')?.value) {
          this.onGlobalTVAChange();
        }
      });

    // Écouteur pour la remise globale
    this.panierForm.get('remiseGlobale')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe((remise) => {
        console.log('Changement remiseGlobale:', remise);
        if (!this.panierForm.get('remiseParArticle')?.value) {
          this.onGlobalRemiseChange();
        }
      });

  }

  // Gestion des changements de mode TVA
  private onTVAModeChange(tvaParArticle: boolean): void {
    console.log('Changement mode TVA vers:', tvaParArticle ? 'article' : 'global');

    this.tvaParArticle = tvaParArticle;
    this.showTVAFields = tvaParArticle;
    
    // Mettre à jour les articles existants
    this.panierArray.controls.forEach(control => {
      if (tvaParArticle) {
        // Mode article: activer le champ tauxTVA de l'article
        control.get('tauxTVA')?.enable();
         // Si l'article n'a pas de taux TVA, utiliser celui du produit
        /* const currentTauxTVA = control.get('tauxTVA')?.value || 0;
        if (currentTauxTVA === 0) {
          const produitId = control.get('produitId')?.value;
          const produit = this.produitsDisponibles.find(p => p.id === produitId);
          if (produit && produit.tauxTVA) {
            control.patchValue({
              tauxTVA: produit.tauxTVA
            }, { emitEvent: false });
          }
        } */
      } else {
        // Mode global: désactiver le champ tauxTVA de l'article
        control.get('tauxTVA')?.disable();
        // Utiliser le taux par défaut du produit
       /* const tauxTVAGlobal = this.panierForm.get('tauxTVAGlobal')?.value;
       if (!tauxTVAGlobal || tauxTVAGlobal === 0) {
          // Chercher un taux TVA parmi les produits
          const tauxExistant = this.produitsDisponibles.find(p => p.tauxTVA && p.tauxTVA > 0)?.tauxTVA;
          this.panierForm.patchValue({
            tauxTVAGlobal: tauxExistant || 18 // Valeur par défaut
          }, { emitEvent: false });
        } */
      }
    });

    // Mettre à jour les totaux
    //this.updateAllArticles();
    // Recalculer tous les articles
    //this.recalculerTousLesArticles();
    // Appeler onModeChange pour recalculer
    this.onModeChange();
  }

  // Gestion des changements de mode remise
  private onRemiseModeChange(remiseParArticle: boolean): void {
  
    console.log('Changement mode remise vers:', remiseParArticle ? 'article' : 'global');

    this.remiseParArticle = remiseParArticle;
    this.showRemiseFields = remiseParArticle;
    
    // Mettre à jour les articles existants
    this.panierArray.controls.forEach(control => {
      if (remiseParArticle) {
        control.get('remise')?.enable();
      } else {
        control.get('remise')?.disable();
        control.patchValue({ remise: 0 }, { emitEvent: false });
      }
    });

    // Mettre à jour les totaux
    //this.updateAllArticles();
    // Recalculer tous les articles
    //this.recalculerTousLesArticles();
    // Appeler onModeChange pour recalculer
    //this.onModeChange();
  }

  // Gestion du changement de TVA globale
  private onGlobalTVAChange(): void {
    console.log('Changement TVA globale');
    this.recalculerTousLesArticles();

    // Forcer la mise à jour des totaux
    this.cdr.detectChanges();

    if (this.panierBrouillon?.id && this.panierArray.length > 0) {
      const updatedPanier = this.preparePanierForDB();
      this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
    }
  }

  // Gestion du changement de remise globale
  private onGlobalRemiseChange(): void {
    console.log('Changement remise globale');

    this.recalculerTousLesArticles();

    // Forcer la mise à jour des totaux
   this.cdr.detectChanges();

    if (this.panierBrouillon?.id && this.panierArray.length > 0) {
      const updatedPanier = this.preparePanierForDB();
      this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
    }
  }

  // Mettre à jour tous les articles
  private updateAllArticles(): void {
    this.panierArray.controls.forEach((control, index) => {
      const article = control.value as ArticlePanier;
      this.calculerTotauxArticle(control);
      
      // Mettre à jour en base si nécessaire
      if (article.id && this.panierBrouillon?.id) {
        this.updateSubject$.next({ article, index });
      }
    });
  }

  private calculerTotauxArticle(article: FormGroup): void {
  /* const quantite = articleGroup.get('quantite')?.value || 0;
  const prixUnitaire = articleGroup.get('prixUnitaire')?.value || 0;
  const remise = articleGroup.get('remise')?.value || 0;
  const tauxTVA = articleGroup.get('tauxTVA')?.value || 0;
  
  const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
  const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  //const tauxTVAGlobal = this.panierForm.get('tauxTVAGlobal')?.value || 0;
  //const remiseGlobale = this.panierForm.get('remiseGlobale')?.value || 0;

  // 1. Total HT de base (IMPORTANT: c'est la base pour tout)
  const totalHTBase = quantite * prixUnitaire;
  console.log('Calcul totalHTBase:', quantite, '*', prixUnitaire, '=', totalHTBase);
  
  // 2. Calcul de la remise pour cet article
  let montantRemiseArticle  = 0;

  if (remiseParArticle && remise > 0) {
    // Remise par article (pourcentage sur cet article)
    montantRemiseArticle  = totalHTBase * (remise / 100);
    console.log('Remise par article:', totalHTBase, '*', remise, '% =', montantRemiseArticle);
  }
  
  const htApresRemise = totalHTBase - montantRemiseArticle;
 // 3. Calcul de la TVA pour cet article
  let montantTVAArticle = 0;
  
  if (tvaParArticle && tauxTVA > 0) {
    // Mode TVA par article
    montantTVAArticle = htApresRemise * (tauxTVA / 100);
    console.log('Montant TVA par article:', htApresRemise, '*', tauxTVA, '% =', montantTVAArticle);

  } 
  // 4. Total TTC de l'article
  const totalTTCArticle = htApresRemise + montantTVAArticle;

  // Mettre à jour les champs calculés
  articleGroup.patchValue({
    totalHT: htApresRemise,
    montantRemise: montantRemiseArticle,
    montantTVA: montantTVAArticle,
    totalTTC: totalTTCArticle
  }, { emitEvent: false });
  
  console.log('Calcul article:', {
    produit: articleGroup.get('produit')?.value,
    modeTVA: tvaParArticle ? 'article' : 'global',
    modeRemise: remiseParArticle ? 'article' : 'global',
    totalHTBase,
    montantRemiseArticle,
    montantTVAArticle,
    totalTTCArticle
  }); */

  const qte = this.n(article, 'quantite');
  const prix = this.n(article, 'prixUnitaire');
  const remise = this.n(article, 'remise');
  const tva = this.n(article, 'tauxTVA');

  const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;

  const baseHT = qte * prix;

  const montantRemise = remiseParArticle
    ? baseHT * remise / 100
    : 0;

  const htApresRemise = baseHT - montantRemise;

  const montantTVA = tvaParArticle
    ? htApresRemise * tva / 100
    : 0;

  article.patchValue({
    totalHT: htApresRemise,
    montantRemise,
    montantTVA,
    totalTTC: htApresRemise + montantTVA
  }, { emitEvent: false });
}

n(fg: FormGroup, key: string): number {
  return Number(fg.get(key)?.value) || 0;
}

    // Gestion des boutons radio
    onTVARadioChange(value: 'article' | 'global'): void {
      console.log('Changement mode TVA:', value);
      this.tvaRadioValue = value;
      const tvaParArticle = value === 'article';
      
      this.panierForm.patchValue({ tvaParArticle });
      this.tvaParArticle = tvaParArticle;
      
      // Mettre à jour l'état des champs
      //this.updateFieldStatesBasedOnModes();
      
      // Recalculer les totaux
      //this.updateAllArticles();
      // Appeler directement onTVAModeChange
      this.onTVAModeChange(tvaParArticle);

      
    }

    onRemiseRadioChange(value: 'article' | 'global'): void {
      console.log('Changement mode remise:', value);
      this.remiseRadioValue = value;
      const remiseParArticle = value === 'article';
      
      this.panierForm.patchValue({ remiseParArticle });
      this.remiseParArticle = remiseParArticle;
      
      // Mettre à jour l'état des champs
      //this.updateFieldStatesBasedOnModes();
      
      // Recalculer les totaux
      //this.updateAllArticles();
      // Appeler directement onRemiseModeChange
      this.onRemiseModeChange(remiseParArticle);
    }

  private getTauxTVADefault(produitId: number): number {
  if (!produitId) return 0;
  
  const produit = this.produitsDisponibles.find(p => p.id === produitId);
  return produit?.tauxTVA || 0;
}

private recalculerTotauxArticles(): void {
  console.log('Recalcul des totaux pour tous les articles');
  
  this.panierArray.controls.forEach((control, index) => {
    const articleGroup = control as FormGroup;
    const articleData = articleGroup.value;
    
    // TOUJOURS recalculer les totaux au chargement
    console.log(`Recalcul article ${index}:`, {
      produit: articleData.produit,
      quantite: articleData.quantite,
      prixUnitaire: articleData.prixUnitaire,
      tauxTVA: articleData.tauxTVA,
      remise: articleData.remise
    });
    
    // Appeler la méthode de calcul
    this.calculerTotauxArticle(articleGroup);
    
    // Déboguer les résultats
    console.log(`Résultats article ${index}:`, {
      totalHT: articleGroup.get('totalHT')?.value,
      totalTTC: articleGroup.get('totalTTC')?.value,
      montantTVA: articleGroup.get('montantTVA')?.value
    });
    
    // Mettre à jour l'article en base si nécessaire
    if (articleData.id && this.panierBrouillon?.id) {
      const articleToUpdate = new ArticlePanier({
        ...articleData,
        totalHT: articleGroup.get('totalHT')?.value,
        totalTTC: articleGroup.get('totalTTC')?.value,
        montantTVA: articleGroup.get('montantTVA')?.value,
        montantRemise: articleGroup.get('montantRemise')?.value
      });
      
      // Mettre à jour en base avec un délai
      setTimeout(() => {
        this.updateArticleInDB(articleToUpdate, index);
      }, 100);
    }
  });
  
  // FORCER la détection de changement
  setTimeout(() => {
    this.cdr.detectChanges();
    console.log('After recalcul, totalPanier:', this.totalPanier);
  }, 0);
}
private updateFieldStatesBasedOnModes(): void {
  console.log('Mise à jour des stat basée sur le mode de TVA')
  const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
  const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  
  // Mettre à jour l'affichage des colonnes
  this.showTVAFields = tvaParArticle;
  this.showRemiseFields = remiseParArticle;
  
  // Activer/désactiver les champs selon les modes
  this.panierArray.controls.forEach(control => {
    const articleGroup = control as FormGroup;
    
    if (tvaParArticle) {
      articleGroup.get('tauxTVA')?.enable();
    } else {
      articleGroup.get('tauxTVA')?.disable();
    }
    
    if (remiseParArticle) {
      articleGroup.get('remise')?.enable();
    } else {
      articleGroup.get('remise')?.disable();
    }
  });
  
  // Mettre à jour les radios
  this.tvaRadioValue = tvaParArticle ? 'article' : 'global';
  this.remiseRadioValue = remiseParArticle ? 'article' : 'global';
}

private updatePanierTotals(): void {
  // Forcer le recalcul
  this.cdr.detectChanges();
  
  // Émettre les changements
  this.totalPanierChange.emit(this.totalAPayer);
  
  // Mettre à jour le panier en base si nécessaire
  if (this.panierBrouillon?.id) {
    const updatedPanier = this.preparePanierForDB();
    this.updatePanierInDB(this.panierBrouillon.id, updatedPanier);
  }
}
debugArticleCalculations(articleGroup: FormGroup, operation: string): void {
  const values = articleGroup.value;
  console.log(`${operation}:`, {
    produit: values.produit,
    quantite: values.quantite,
    prixUnitaire: values.prixUnitaire,
    tauxTVA: values.tauxTVA,
    remise: values.remise,
    totalHT: values.totalHT,
    montantTVA: values.montantTVA,
    montantRemise: values.montantRemise,
    totalTTC: values.totalTTC
  });
}

private determineTVAMode(): boolean {
  // Si des produits ont un taux de TVA > 0, on active le mode par article
  const hasProductsWithTVA = this.produitsDisponibles.some(
    produit => produit.tauxTVA && produit.tauxTVA > 0
  );
  
  if (hasProductsWithTVA) {
    console.log('Produits avec TVA détectés - mode TVA par article activé');
    return true; // TVA par article
  }
  
  // Sinon, on utilise le choix par défaut (paramètre d'entrée)
  console.log('Aucun produit avec TVA - utilisation du mode par défaut:', this.tvaParArticle);
  return this.tvaParArticle;
}

// Méthode pour recalculer TOUS les articles
private recalculerTousLesArticles(): void {
  console.log('Recalcul de tous les articles');
  
  this.panierArray.controls.forEach((control, index) => {
    const articleGroup = control as FormGroup;
    this.calculerTotauxArticle(articleGroup);
    
    // Mettre à jour en base si nécessaire
    const article = articleGroup.value as ArticlePanier;
    if (article.id && this.panierBrouillon?.id) {
      this.updateArticleInDB(article, index);
    }
  });
  
  // Mettre à jour les totaux globaux
  this.updateTotauxGlobaux();
}

// Méthode pour mettre à jour les totaux globaux
private updateTotauxGlobaux(): void {
  const tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
  const remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  const tauxTVAGlobal = this.panierForm.get('tauxTVAGlobal')?.value || 0;
  const remiseGlobale = this.panierForm.get('remiseGlobale')?.value || 0;

  // 1. Calculer le total HT de tous les articles
  let totalHTGlobal = 0;
  this.panierArray.controls.forEach(control => {
    totalHTGlobal += control.get('totalHT')?.value || 0;
  });

  // 2. Appliquer la remise globale si nécessaire
  let montantRemiseGlobal = 0;
  if (!remiseParArticle && remiseGlobale > 0) {
    montantRemiseGlobal = totalHTGlobal * (remiseGlobale / 100);
  }

  // 3. Calcul HT après remise globale
  const htApresRemiseGlobal = totalHTGlobal - montantRemiseGlobal;

  // 4. Calculer la TVA globale si nécessaire
  let montantTVAGlobal = 0;
  if (!tvaParArticle && tauxTVAGlobal > 0) {
    montantTVAGlobal = htApresRemiseGlobal * (tauxTVAGlobal / 100);
  }

  // 5. Calculer le total TTC final
  const totalTTCFinal = htApresRemiseGlobal + montantTVAGlobal;

  console.log('Totaux globaux:', {
    totalHTGlobal,
    remiseGlobale,
    montantRemiseGlobal,
    tauxTVAGlobal,
    montantTVAGlobal,
    htApresRemiseGlobal,
    totalTTCFinal,
    modeTVA: tvaParArticle ? 'article' : 'global',
    modeRemise: remiseParArticle ? 'article' : 'global'
  });

  this.totalPanierChange.emit(this.totalAPayer);
  // Mettre à jour le panier brouillon
  if (this.panierBrouillon) {
    this.panierBrouillon.totalHT = totalHTGlobal;
    this.panierBrouillon.tva = montantTVAGlobal;
    this.panierBrouillon.totalTTC = totalTTCFinal;
    this.panierBrouillon.remiseGlobale = remiseGlobale;
    this.panierBrouillon.tauxTVA = tauxTVAGlobal;
    
    // Mettre à jour en base
    if (this.panierBrouillon.id) {
      this.updatePanierInDB(this.panierBrouillon.id, this.panierBrouillon);
    }
  }
}

private forceRefreshTotals(): void {
  console.log('Forçage du rafraîchissement des totaux');
  
  // 1. Recalculer les totaux de chaque article
  this.panierArray.controls.forEach((control, index) => {
    console.log('Index article',index);
    const articleGroup = control as FormGroup;
    this.calculerTotauxArticle(articleGroup);
  });
  
  // 2. Forcer la détection de changement
  this.cdr.detectChanges();
  
  // 3. Émettre les changements
  this.totalPanierChange.emit(this.totalAPayer);
  
  console.log('Totaux rafraîchis:', {
    totalPanier: this.totalPanier,
    montantRemise: this.montantRemise,
    montantTVA: this.montantTVA,
    totalAPayer: this.totalAPayer
  });
}

private onModeChange(): void {
  console.log('Changement de mode détecté');
  
  // Recalculer tous les articles
  this.panierArray.controls.forEach(control => {
    this.calculerTotauxArticle(control as FormGroup);
  });
  
  // Forcer la mise à jour des totaux
  this.cdr.detectChanges();
  console.log('Totaux après changement de mode:', {
    totalHT: this.totalPanier,
    montantRemise: this.montantRemise,
    montantTVA: this.montantTVA,
    totalAPayer: this.totalAPayer
  });
}
}
