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
  styleUrls: ['./panier.component.css']
})
export class PanierComponent implements OnInit, OnChanges, OnDestroy {
  // Inputs
  @Input() produitsDisponibles: Produits[] = [];
  @Input() showPanierSection = false;
  @Input() titre = '🛒 Panier';
  @Input() tauxTVAList: number[] = [5, 10, 15, 18, 20];
  @Input() modeCompact = false;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() showButtonsActions = true;
  @Input() showRemiseField = true;
  @Input() showAvanceField = true;
  @Input() typeEntite: 'client' | 'fournisseur' = 'client';
  @Input() resetPanier = false;
  @Input() panierData: Panier | null = null;
  @Input() tvaParArticle = true;
  @Input() remiseParArticle = true;

  // Outputs
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrer = new EventEmitter<Panier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnuler = new EventEmitter<void>();
  @Output() showBonButtons = new EventEmitter<boolean>();
  @Output() totalPanierChange = new EventEmitter<number>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onPanierStatutChange = new EventEmitter<Panier>();


  // Propriétés du panier
  panier!: Panier;
  panierForm!: FormGroup;
  
  // Propriétés d'état
  isFormDisabled = false;
  ispanierValid = false;
  showTVAFields = false;
  showRemiseFields = false;
  tvaRadioValue: 'article' | 'global' = 'article';
  remiseRadioValue: 'article' | 'global' = 'global';

  // Propriétés UI
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentTime: string = new Date().toLocaleTimeString();

  // Gestion des abonnements et état
  private destroy$ = new Subject<void>();
  private alreadyLoadedPanierId: number | null = null;
  panierBrouillon: Panier | null = null;
  private panierCharge = false;
  private updateSubject$ = new Subject<{article: ArticlePanier, index: number}>();
  _uid = Math.random().toString(36).substr(2, 9);

  // Services
  private fb = inject(FormBuilder);
  private bonBrouillonService = inject(BonBrouillonService);
  private panierService = inject(PaniersService);
  private articlesPanierService = inject(ArticlesPanierService);
  private cdr = inject(ChangeDetectorRef);

  // === LIFECYCLE METHODS ===

  ngOnInit() {
    this.initialiserPanier();
    this.initialiserFormulaire();
    this.initialiserEcouteurs();
    this.mettreAJourHeure();
    // Écouter le panier brouillon avec setTimeout pour éviter les erreurs de cycle
    setTimeout(() => {
      this.bonBrouillonService.panierBrouillon$
        .pipe(takeUntil(this.destroy$))
        .subscribe(panierData => {
          console.log('📩 Panier brouillon reçu du service:', panierData);
          
          if (panierData) {
            // Toujours créer une nouvelle instance de Panier
            const panier = new Panier(panierData);
            console.log('🔄 Panier converti:', {
              id: panier.id,
              articlesCount: panier.tousLesArticles.length
            });
            
            this.panierBrouillon = panier;
            this.chargerPanierBrouillon(panier);
          } else {
            console.log('📭 Aucun panier brouillon');
          }
        });
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.gererChangements(changes);
  }

  // === INITIALISATION ===

  private initialiserPanier(): void {
    this.panier = new Panier({
      tvaParArticle: this.tvaParArticle,
      remiseParArticle: this.remiseParArticle,
      typeEntite: this.typeEntite,
      tauxTVA: this.tauxTVAList[0] || 0,
      remiseGlobale: 0,
      avance: 0,
      statut: 'en_cours'
    });
  }

  private initialiserFormulaire(): void {
    this.panierForm = this.fb.group({
      remiseGlobale: [0, [Validators.min(0), Validators.max(100)]],
      avance: [0, [Validators.min(0)]],
      typePaiement: ['caisse', Validators.required],
      tauxTVAGlobal: [this.tauxTVAList[0] || 0],
      tvaParArticle: [this.tvaParArticle],
      remiseParArticle: [this.remiseParArticle],
      panier: this.fb.array([])
    });

    this.mettreAJourAffichageChamps();
  }

  private initialiserEcouteurs(): void {
    // Écouter les changements de mode TVA/Remise
    this.panierForm.get('tvaParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(v => {
        this.tvaRadioValue = v ? 'article' : 'global';
        this.onTVAModeChange(v);
      });

    this.panierForm.get('remiseParArticle')!.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(v => {
        this.remiseRadioValue = v ? 'article' : 'global';
        this.onRemiseModeChange(v);
      });

    // Écouter les changements du formulaire
    this.panierForm.valueChanges
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        this.synchroniserFormulaireVersModele();
      });

    // Écouter les changements des articles
    /* this.panierArray.valueChanges
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        this.recalculerTousLesArticles();
      }); */

    // Écouter le panier brouillon
    /* this.bonBrouillonService.panierBrouillon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(panier => {
        this.panierBrouillon = panier;
        if (panier) {
          this.chargerPanierBrouillon(panier);
          //this.panierCharge = true;
        }
      }); */

    // Écouteur pour les mises à jour d'articles avec debounce
    this.updateSubject$
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(({article, index}) => {
        this.performArticleUpdate(article, index);
      }); 
  }

  // === GESTION DES CHANGEMENTS ===

  private gererChangements(changes: SimpleChanges): void {
    if (changes['resetPanier']?.currentValue === true) {
      this.reinitialiserPanier();
    }

    if (changes['typeEntite']) {
      this.reinitialiserPanier();
    }

    if (changes['panierData']?.currentValue && !this.isFormDisabled) {
      if(this.panierData) this.chargerPanierExistant(this.panierData);
    }

    if (changes['tvaParArticle']) {
      this.tvaRadioValue = this.tvaParArticle ? 'article' : 'global';
    }

    if (changes['remiseParArticle']) {
      this.remiseRadioValue = this.remiseParArticle ? 'article' : 'global';
    }
  }

  // === GETTERS ===

  get panierArray(): FormArray<FormGroup> {
    return this.panierForm.get('panier') as FormArray<FormGroup>;
  }

  get totalPanier(): number {
    return this.panier?.totalHT || 0;
  }

  get montantTVA(): number {
    return this.panier?.tva || 0;
  }

  get montantRemise(): number {
    return this.panier?.remise || 0;
  }

  get totalAPayer(): number {
    return this.panier?.totalTTC || 0;
  }

  // === GESTION DU PANIER ===

  reinitialiserPanier(): void {
    if (!this.panierForm) return;

    this.initialiserPanier();
    
    this.panierForm.reset({
      remiseGlobale: 0,
      avance: 0,
      typePaiement: 'caisse',
      tauxTVAGlobal: this.tauxTVAList[0] || 0,
      tvaParArticle: this.tvaParArticle,
      remiseParArticle: this.remiseParArticle
    });

    this.panierArray.clear();
    this.searchInput = '';
    this.filteredProduits = [];
    this.isFormDisabled = false;
    this.ispanierValid = false;
    this.alreadyLoadedPanierId = null;
    this.panierCharge = false;

    this.showBonButtons.emit(false);
    this.totalPanierChange.emit(0);
  }

  private chargerPanierBrouillon(panier: Panier): void {
    console.log('Chargement panier brouillon:', panier);

    if (!panier) {
      console.error('Panier brouillon est null');
      return;
    }

    // Utiliser setTimeout pour éviter les erreurs de cycle
    setTimeout(() => {
      this.chargerPanierExistant(panier);
      this.isFormDisabled = false;
      this.showBonButtons.emit(false);
    }, 0);
  }

  private chargerPanierExistant(panier: Panier): void {
  console.log('Chargement du panier existant:', panier);
  
  if (!panier) {
    console.error('Panier est null ou undefined');
    return;
  }
// Utiliser tousLesArticles pour récupérer tous les articles
  const tousLesArticles = panier.tousLesArticles || [];

this.panier = new Panier({
    ...panier,
    articles:tousLesArticles,
    tvaParArticle: panier.tvaParArticle !== undefined ? panier.tvaParArticle : true,
    remiseParArticle: panier.remiseParArticle !== undefined ? panier.remiseParArticle : false
  });

  // FORCER le recalcul des totaux immédiatement
  this.panier.calculerTotals();

  // Mettre à jour l'état du formulaire selon le statut
  this.isFormDisabled = this.panier.statut === 'validé';
  
  console.log('Panier modèle mis à jour:', {
    id: this.panier.id,
    totalHT: this.panier.totalHT,
    totalTTC: this.panier.totalTTC,
    articlesCount: this.panier.articles.length
  });
  
  // Réinitialiser d'abord le panier
  this.panierArray.clear();

  // Charger les articles - CORRECTION ICI: Vérifier que tousLesArticles existe
   const articlesACharger = panier.tousLesArticles || [];
  console.log('Articles à charger:', articlesACharger);
  console.log('Articles à charger:', articlesACharger.length);
  
  articlesACharger.forEach((article, index) => {
    console.log(`Article ${index}:`, {
      id: article.id,
      produit: article.produit?.designation,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire
    });
    this.ajouterArticleAuFormulaire(article);
  });

  // Mettre à jour le formulaire
  this.panierForm.patchValue({
    remiseGlobale: panier.remiseGlobale || 0,
    avance: panier.avance || 0,
    tauxTVAGlobal: panier.tauxTVA || this.tauxTVAList[0] || 0,
    tvaParArticle: panier.tvaParArticle !== undefined ? panier.tvaParArticle : true,
    remiseParArticle: panier.remiseParArticle !== undefined ? panier.remiseParArticle : false
  });

  this.mettreAJourEtatFormulaire();
  // 5. Mettre à jour l'affichage des champs
  this.mettreAJourAffichageChamps();
  this.mettreAJourEtatChampsTVA();
  this.mettreAJourEtatChampsRemise();
  // Mettre à jour l'état
  //this.isFormDisabled = panier.statut === 'validé';
  this.mettreAJourEtatFormulaire();

  // Émettre les événements
  this.showBonButtons.emit(this.isFormDisabled);
  this.totalPanierChange.emit(this.panier.totalTTC);

  /* console.log('Panier chargé avec succès:', {
    articles: this.panierArray.length,
    totalHT: this.panier.totalHT,
    totalTTC: this.panier.totalTTC,
    isFormDisabled: this.isFormDisabled
  });  */
  // 8. Forcer la détection de changement
  this.cdr.detectChanges();

  console.log('🎉 Panier chargé avec succès:', {
    panierModel: {
      totalHT: this.panier.totalHT,
      totalTTC: this.panier.totalTTC,
      tva: this.panier.tva,
      remise: this.panier.remise
    },
    getters: {
      totalPanier: this.totalPanier,
      totalAPayer: this.totalAPayer,
      montantTVA: this.montantTVA,
      montantRemise: this.montantRemise
    },
    formArrayLength: this.panierArray.length
  });
}

  // === GESTION DES ARTICLES ===

  filterProduits(): void {
    if (!this.searchInput || this.searchInput.length < 2) {
      this.filteredProduits = [];
      return;
    }

    this.filteredProduits = this.produitsDisponibles.filter(prod =>
      prod.designation.toLowerCase().includes(this.searchInput.toLowerCase())
    );
  }

  selectProduit(produit: Produits): void {
    this.ajouterProduit(produit);
    this.searchInput = '';
    this.filteredProduits = [];
  }

  ajouterProduit(produit: Produits): void {
    const indexExistant = this.trouverIndexArticleExistant(produit.id!);

    if (indexExistant !== -1) {
      this.incrementerQuantiteArticle(indexExistant);
    } else {
      this.ajouterNouvelArticle(produit);
    }
  }

  removeArticle(index: number): void {
    if (!confirm('Supprimer cet article ?')) return;

    const articleSupprime = this.panier.supprimerArticle(index);
    this.synchroniserModeleVersFormulaire();

    if (articleSupprime?.id && this.panierBrouillon?.id) {
      this.supprimerArticleEnBase(articleSupprime.id);
    } else if (this.panierBrouillon?.id) {
      this.mettreAJourPanierEnBase();
    }
  }

  // === MÉTHODES PRIVÉES POUR LES ARTICLES ===

  private trouverIndexArticleExistant(produitId: number): number {
    return this.panier.articles.findIndex(article =>
      article.produitId === produitId
    );
  }

  private incrementerQuantiteArticle(index: number): void {
    this.panier.incrementerQuantiteArticle(index);
    this.synchroniserModeleVersFormulaire();
    
    const article = this.panier.articles[index];
    if (article.id && this.panierBrouillon?.id) {
      this.updateSubject$.next({ article, index });
    }
  }

  private ajouterNouvelArticle(produit: Produits): void {
    const article = new ArticlePanier({
      produitId: produit.id,
      produit: produit,
      quantite: 1,
      prixUnitaire: this.getPrixUnitaireSelonTypeEntite(produit),
      prixAchatUnitaire: produit.prixAchatUnitaire,
      prixVenteUnitaire: produit.prixVenteUnitaire,
      tauxTVA: produit.tauxTVA || 0,
      remise: 0
    });

    this.panier.ajouterArticle(article);
    this.synchroniserModeleVersFormulaire();

    if (this.panierBrouillon?.id) {
      this.ajouterArticleEnBase(article);
    }
  }

  // === SYNCHRONISATION MODÈLE/FORMULAIRE ===

  /* private synchroniserFormulaireVersModele(): void {
    // Mettre à jour les propriétés du panier depuis le formulaire
    this.panier.remiseGlobale = this.panierForm.value.remiseGlobale || 0;
    this.panier.tauxTVA = this.panierForm.value.tauxTVAGlobal || 0;
    this.panier.remiseParArticle = this.panierForm.value.remiseParArticle;
    this.panier.tvaParArticle = this.panierForm.value.tvaParArticle;
    this.panier.avance = this.panierForm.value.avance || 0;

    // Recalculer les totaux
    this.panier.calculerTotals();
    
    // Émettre les changements
    this.totalPanierChange.emit(this.panier.totalTTC);
  } */

  private synchroniserFormulaireVersModele(): void {
    const raw = this.panierForm.getRawValue(); // ✅ IMPORTANT

    this.panier.remiseGlobale =
      raw.remiseGlobale !== null && raw.remiseGlobale !== undefined
        ? raw.remiseGlobale
        : this.panier.remiseGlobale;

    this.panier.tauxTVA =
      raw.tauxTVAGlobal !== null && raw.tauxTVAGlobal !== undefined
        ? raw.tauxTVAGlobal
        : this.panier.tauxTVA;

    this.panier.remiseParArticle = raw.remiseParArticle;
    this.panier.tvaParArticle = raw.tvaParArticle;
    this.panier.avance = raw.avance ?? this.panier.avance;

    this.panier.calculerTotals();
    this.totalPanierChange.emit(this.panier.totalTTC);
  }


  private synchroniserModeleVersFormulaire(): void {
    // Synchroniser les articles du modèle vers le formulaire
    this.panierArray.clear();

    this.panier.articles.forEach(article => {
      this.ajouterArticleAuFormulaire(article);
    });

    // Forcer la détection de changement
    this.cdr.detectChanges();
  }

  private ajouterArticleAuFormulaire(article: ArticlePanier): void {

    // S'assurer que l'article a ses totaux calculés
    if (!article.totalHT || !article.totalTTC) {
      article.calculerTotaux(
        this.panier.tvaParArticle,
        this.panier.remiseParArticle,
        this.panier.tauxTVA,
        this.panier.remiseGlobale
      );
    }
    const articleGroup = this.fb.group({
      id: [article.id],
      produitId: [article.produitId, Validators.required],
      produit: [{ value: article.produit?.designation ||article.Produit?.designation || '', disabled: true }],
      uniteStock: [{ value: article.produit?.unite || article.Produit?.unite || '', disabled: true }],
      quantite: [article.quantite, [Validators.required, Validators.min(1)]],
      prixUnitaire: [article.prixUnitaire, [Validators.required, Validators.min(0)]],
      prixAchatUnitaire: [article.prixAchatUnitaire],
      prixVenteUnitaire: [article.prixVenteUnitaire],
      tauxTVA: [article.tauxTVA || 0, [Validators.min(0), Validators.max(100)]],
      remise: [article.remise || 0, [Validators.min(0), Validators.max(100)]],
      totalHT: [{ value: article.totalHT || 0, disabled: true }],
      montantRemise: [{ value: article.montantRemise || 0, disabled: true }],
      montantTVA: [{ value: article.montantTVA || 0, disabled: true }],
      totalTTC: [{ value: article.totalTTC || 0, disabled: true }]
    });

    this.configurerEcouteursArticle(articleGroup);
    this.panierArray.push(articleGroup);
    console.log('📝 Article ajouté au formulaire:', {
    produit: article.produit?.designation,
    totalHT: article.totalHT,
    totalTTC: article.totalTTC
  });
  }

  // === GESTION DES ÉCOUTEURS D'ARTICLES ===

  private configurerEcouteursArticle(articleGroup: FormGroup): void {
  const fields = ['quantite', 'prixUnitaire', 'remise', 'tauxTVA'];
  
  fields.forEach(field => {
    articleGroup.get(field)!.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe((newValue) => {
        console.log(`🔄 Changement ${field}:`, newValue);
        
        // 1. Mettre à jour l'article dans le modèle
        const index = this.panierArray.controls.indexOf(articleGroup);
        if (index !== -1) {
          const articleData = articleGroup.value;
          
          // Mettre à jour l'article dans le modèle Panier
          this.panier.mettreAJourArticle(index, articleData);
          
          // 2. Recalculer les totaux de l'article
          const article = this.panier.articles[index];
          article.calculerTotaux(
            this.panier.tvaParArticle,
            this.panier.remiseParArticle,
            this.panier.tauxTVA,
            this.panier.remiseGlobale
          );
          
          // 3. Mettre à jour les champs calculés dans le formulaire
          articleGroup.patchValue({
            totalHT: article.totalHT || 0,
            montantRemise: article.montantRemise || 0,
            montantTVA: article.montantTVA || 0,
            totalTTC: article.totalTTC || 0
          }, { emitEvent: false });
          
          // 4. Recalculer les totaux du panier
          this.panier.calculerTotals();
          
          // 5. Émettre le changement
          this.totalPanierChange.emit(this.panier.totalTTC);
          
          // 6. Forcer la détection de changement
          this.cdr.detectChanges();
          
          console.log('✅ Article mis à jour:', {
            produit: article.produit?.designation,
            field: field,
            newValue: newValue,
            totalHT: article.totalHT,
            totalTTC: article.totalTTC,
            montantRemise: article.montantRemise
          });
          
          // 7. Mettre à jour en base si nécessaire
          if (article.id && this.panierBrouillon?.id) {
            this.updateSubject$.next({ article: article, index });
          }
        }
      });
  });
}

  private onArticleChange(articleGroup: FormGroup): void {
    const index = this.panierArray.controls.indexOf(articleGroup);
    if (index !== -1) {
      const donneesArticle = articleGroup.value;
      this.panier.mettreAJourArticle(index, donneesArticle);
      
      if (donneesArticle.id && this.panierBrouillon?.id) {
        this.updateSubject$.next({ article: donneesArticle, index });
      }
    }
  }

  // === GESTION DES MODES TVA/REMISE ===

  private onTVAModeChange(tvaParArticle: boolean): void {
    this.panier.tvaParArticle = tvaParArticle;
    this.showTVAFields = tvaParArticle;
    this.mettreAJourEtatChampsTVA();
    //this.recalculerTousLesArticles();
  }

  private onRemiseModeChange(remiseParArticle: boolean): void {
    this.panier.remiseParArticle = remiseParArticle;
    this.showRemiseFields = remiseParArticle;
    this.mettreAJourEtatChampsRemise();
    //this.recalculerTousLesArticles();
  }

  onTVARadioChange(value: 'article' | 'global'): void {
    this.panierForm.patchValue({ tvaParArticle: value === 'article' });
  }

  onRemiseRadioChange(value: 'article' | 'global'): void {
    this.panierForm.patchValue({ remiseParArticle: value === 'article' });
  }

  private mettreAJourEtatChampsTVA(): void {
    this.panierArray.controls.forEach(control => {
      if (this.panier.tvaParArticle) {
        control.get('tauxTVA')?.enable();
      } else {
        control.get('tauxTVA')?.disable();
      }
    });
  }

  private mettreAJourEtatChampsRemise(): void {
    this.panierArray.controls.forEach(control => {
      if (this.panier.remiseParArticle) {
        control.get('remise')?.enable();
      } else {
        control.get('remise')?.disable();
        //control.patchValue({ remise: 0 }, { emitEvent: false });
      }
    });
  }

  private mettreAJourAffichageChamps(): void {
    this.showTVAFields = this.panier.tvaParArticle;
    this.showRemiseFields = this.panier.remiseParArticle;
  }

  // === MÉTHODES DE CALCUL ===

  /* private recalculerTousLesArticles(): void {
    this.panierArray.controls.forEach((control, index) => {
      const donneesArticle = control.value;
      this.panier.mettreAJourArticle(index, donneesArticle);
    });
    
    this.cdr.detectChanges();
    this.totalPanierChange.emit(this.panier.totalTTC);
  } */

  // === ÉVÉNEMENTS UI ===

 enregistrerPanier(): void {
  if (this.panier.isValid) {

    // ❗ STOPPER les valueChanges
    this.panierForm.disable({ emitEvent: false });

    //Changer le statut du panier
    this.panier.statut = 'validé';

    //Émettre l'événement de changement de statut
    this.onPanierStatutChange.emit(this.panier);


    this.panier.calculerTotals(); // dernier calcul propre

    this.ispanierValid = true;
    this.isFormDisabled = true;
    this.showBonButtons.emit(true);
    this.onEnregistrer.emit(this.panier);

    if (this.panierBrouillon?.id) {
      //this.mettreAJourPanierEnBase();
      this.mettreAJourPanierEnBaseAvecStatut('validé');
    }
     console.log('✅ Panier validé', {
      statut: this.panier.statut,
      totalTTC: this.panier.totalTTC
    });
  }
  else {
    console.error('❌ Panier invalide, impossible de valider');
  }
}

private mettreAJourPanierEnBaseAvecStatut(statut: 'en_cours' | 'validé'|'annulé'|'retourné'): void {
  if (!this.panierBrouillon?.id) return;

  console.log(`🔄 Mise à jour statut panier: ${statut}`);
  
  // Créer une copie du panier avec le nouveau statut
  const panierAMettreAJour = this.panier.clone();
  panierAMettreAJour.statut = statut;
  
  this.panierService.updatePanier(this.panierBrouillon.id, panierAMettreAJour)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (panierMisAJour) => {
        console.log(`✅ Statut panier mis à jour: ${panierMisAJour.statut}`);
        
        // Mettre à jour le panier brouillon local
        this.panierBrouillon = panierMisAJour;
        
        // Synchroniser le statut dans le modèle local
        this.panier.statut = panierMisAJour.statut;
      },
      error: (err) => {
        console.error('❌ Erreur mise à jour statut panier:', err);
        
        // En cas d'erreur, revenir à l'état précédent
        if (statut === 'validé') {
          // Si échec de validation, revenir en mode édition
          this.passerEnModeModification();
        }
      }
    });
}


  annulerPanier(): void {
    if (!confirm('Annuler le panier ?')) return;

    if (this.panierBrouillon) {
      this.panierService.deletePanier(this.panierBrouillon.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.reinitialiserPanier();
            this.bonBrouillonService.setPanierBrouillon(null);
            this.onAnnuler.emit();
          },
          error: (err) => console.error('Erreur suppression panier:', err)
        });
    } else {
      this.reinitialiserPanier();
      this.onAnnuler.emit();
    }
  }

  onEditOrSave(): void {
    if (this.isFormDisabled) {
      //this.activerControlesFormulaire();
      //this.showBonButtons.emit(false);
      // Mode "validé" -> passer en mode "modification" (en_cours)
    this.passerEnModeModification();
    } else {
      // Mode "en_cours" -> passer en mode "validé"
      this.enregistrerPanier();
    }
  }

  private passerEnModeModification(): void {
  console.log('🔄 Passage en mode modification');
  
  // 1. Changer le statut du panier
  this.panier.statut = 'en_cours';

  //Émettre l'événement de changement de statut
  this.onPanierStatutChange.emit(this.panier);
  
  // 2. Activer les contrôles
  this.isFormDisabled = false;
  this.activerControlesFormulaire();
  
  // 3. Émettre l'événement pour cacher les boutons du bon
  this.showBonButtons.emit(false);
  
  // 4. Mettre à jour le panier en base si c'est un brouillon
  if (this.panierBrouillon?.id) {
    this.mettreAJourPanierEnBaseAvecStatut('en_cours');
  }
  
  console.log('✅ Mode modification activé', {
    statut: this.panier.statut,
    isFormDisabled: this.isFormDisabled
  });
}

  // === UTILITAIRES ===

  private getPrixUnitaireSelonTypeEntite(produit: Produits): number {
    return this.typeEntite === 'fournisseur'
      ? produit.prixAchatUnitaire || 0
      : produit.prixVenteUnitaire || 0;
  }


  canActivateTvaGlobalMode(): boolean {
    return this.panierArray.controls.some(articleGroup => {
      const tauxTVA = articleGroup.get('tauxTVA')?.value;
      return tauxTVA && tauxTVA > 0;
    });
  }

  // === GESTION DE L'ÉTAT DU FORMULAIRE ===

  private mettreAJourEtatFormulaire(): void {
    if (this.isFormDisabled) {
      this.desactiverControlesFormulaire();
    } else {
      this.activerControlesFormulaire();
    }
  }

  private desactiverControlesFormulaire(): void {
    this.panierArray.controls.forEach(control => {
      control.get('quantite')?.disable();
      control.get('prixUnitaire')?.disable();
    });
    
    this.panierForm.get('remiseGlobale')?.disable();
    this.panierForm.get('avance')?.disable();
    this.panierForm.get('tauxTVAGlobal')?.disable();
    this.panierForm.get('typePaiement')?.disable();
    this.panierForm.get('tvaParArticle')?.disable();
    this.panierForm.get('remiseParArticle')?.disable();
  }

  private activerControlesFormulaire(): void {
    this.panierArray.controls.forEach(control => {
      control.get('quantite')?.enable();
      control.get('prixUnitaire')?.enable();
    });
    
    this.panierForm.get('remiseGlobale')?.enable();
    this.panierForm.get('avance')?.enable();
    this.panierForm.get('tauxTVAGlobal')?.enable();
    this.panierForm.get('typePaiement')?.enable();
    this.panierForm.get('tvaParArticle')?.enable();
    this.panierForm.get('remiseParArticle')?.enable();
    
    this.mettreAJourEtatChampsTVA();
    this.mettreAJourEtatChampsRemise();
  }

  private mettreAJourHeure(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }

  // === OPÉRATIONS BASE DE DONNÉES ===

  private ajouterArticleEnBase(article: ArticlePanier): void {
    if (!this.panierBrouillon?.id) return;

    const articleASauvegarder = new ArticlePanier({
      ...article,
      panierId: this.panierBrouillon.id,
      code_structure: this.panierBrouillon.code_structure
    });

    this.articlesPanierService.create(articleASauvegarder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (articleSauvegarde) => {
          const index = this.panier.trouverArticleIndex(article.produitId!);
          if (index !== -1) {
            this.panier.articles[index].id = articleSauvegarde.id;
            this.synchroniserModeleVersFormulaire();
          }
          this.mettreAJourPanierEnBase();
        },
        error: (err) => console.error('Erreur ajout article:', err)
      });
  }

 private performArticleUpdate(article: ArticlePanier, index: number): void {
  console.log('🔧 Mise à jour article:', {
    id: article.id,
    produit: article.produit?.designation,
    remise: article.remise,
    montantRemise: article.montantRemise,
    tauxTVA: article.tauxTVA,
    montantTVA: article.montantTVA,
    index:index
  });

  if (!this.panierBrouillon?.id || !article.id) return;

  // CRÉER UN OBJET AVEC UN MAPPING EXPLICITE POUR ÉVITER LES CONFUSIONS
  const articleAMettreAJour = {
    id: article.id,
    panierId: this.panierBrouillon.id,
    code_structure: this.panierBrouillon.code_structure,
    produitId: article.produitId,
    
    // CHAMPS FINANCIERS - SÉPARÉS CLAREMENT
    remise: article.remise || 0,
    montantRemise: article.montantRemise || 0,
    tauxTVA: article.tauxTVA || 0,
    montantTVA: article.montantTVA || 0,
    
    // AUTRES CHAMPS
    quantite: article.quantite || 1,
    prixUnitaire: article.prixUnitaire || 0,
    prixAchatUnitaire: article.prixAchatUnitaire || 0,
    prixVenteUnitaire: article.prixVenteUnitaire || 0,
    totalHT: article.totalHT || 0,
    totalTTC: article.totalTTC || 0
  };

  console.log('📤 Données envoyées à l\'API:', articleAMettreAJour);

  this.articlesPanierService.update(article.id, articleAMettreAJour as ArticlePanier)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedArticle) => {
        console.log('✅ Article mis à jour en base:', {
          id: updatedArticle.id,
          remise: updatedArticle.remise,
          tauxTVA: updatedArticle.tauxTVA
        });
        this.mettreAJourPanierEnBase();
      },
      error: (err) => {
        console.error('❌ Erreur mise à jour article:', err);
        // Log détaillé de l'erreur
        if (err.error) {
          console.error('Détails erreur:', err.error);
        }
        if (err.status === 404) {
          console.log('📝 Article non trouvé, tentative de création');
          this.ajouterArticleEnBase(article);
        }
      }
    });
}
  private supprimerArticleEnBase(articleId: number): void {
    if (!this.panierBrouillon?.id) return;

    this.articlesPanierService.deleteArticleFromPanier(this.panierBrouillon.id, articleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Article supprimé de la base');
          this.mettreAJourPanierEnBase();
        },
        error: (err) => console.error('Erreur suppression article:', err)
      });
  }

  private mettreAJourPanierEnBase(): void {
    if (!this.panierBrouillon?.id) return;
    // Utiliser le statut actuel du panier
   this.mettreAJourPanierEnBaseAvecStatut(this.panier.statut);
    /* this.panierService.updatePanier(this.panierBrouillon.id, this.panier)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Panier mis à jour en base'),
        error: (err) => console.error('Erreur mise à jour panier:', err)
      }); */
  }

  // === MÉTHODES PRÉSENTES DANS L'ANCIEN CODE MAIS MANQUANTES ===

 private preparePanierForDB(): Panier {
  
  // Créer une copie profonde du panier
  const panierClone = this.panier.clone();
  
  // S'assurer que tous les champs sont à jour
  panierClone.remiseGlobale = this.panierForm.get('remiseGlobale')?.value || 0;
  panierClone.avance = this.panierForm.get('avance')?.value || 0;
  panierClone.tauxTVA = this.panierForm.get('tauxTVAGlobal')?.value || 0;
  panierClone.remiseParArticle = this.panierForm.get('remiseParArticle')?.value;
  panierClone.tvaParArticle = this.panierForm.get('tvaParArticle')?.value;
  
  // Recalculer les totaux
  panierClone.calculerTotals();
  
  return panierClone;
}

preparePanierData(): Panier {
  return this.preparePanierForDB();
}

}