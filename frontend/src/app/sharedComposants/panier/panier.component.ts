import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Produits } from '../../modeles/produit.modele';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ArticlePanier, Panier } from '../../modeles/panier.model';
import { BonBrouillonService } from '../../services/bon-brouillon.service';
import { PaniersService } from '../../services/paniers.service';
import { ArticlesPanierService } from '../../services/articles-panier.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

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
  @Input() modeCompact = false;
  @Input() showHeader = true;
  @Input() showActions = true;
  @Input() showButtonsActions = true;
  @Input() showRemiseField = true;
  @Input() showAvanceField = true;
  @Input() typeEntite: 'client' | 'fournisseur'|'autre' = 'client';
  @Input() resetPanier = false;
  @Input() tvaParArticle = true;
  @Input() remiseParArticle = true;
  @Input() showTypePaiement = false;

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
  

/*   modesPaiement: ModePaiement[] = [
      new ModePaiement({ libelle: 'Espèce' }),
      new ModePaiement({ libelle: 'Carte' }),
      new ModePaiement({ libelle: 'Virement' }),
       new ModePaiement({ libelle: 'Wave' }),
      new ModePaiement({ libelle: 'Orange Money' }),
      new ModePaiement({ libelle: 'Chèque' }),
      new ModePaiement({ libelle: 'Autre' }),
    ];
 */
  // Propriétés UI
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentTime: string = new Date().toLocaleTimeString();

  // Gestion des abonnements et état
  private destroy$ = new Subject<void>();
  panierBrouillon: Panier | null = null;
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
      tauxTVA:0,
      remiseGlobale: 0,
      avance: 0,
      statut: 'en_cours'
    });
  }

  private initialiserFormulaire(): void {
    this.panierForm = this.fb.group({
      remiseGlobale: [0, [Validators.min(0), Validators.max(100)]],
      avance: [0, [Validators.min(0)]],
      //methodePaiement: [this.modesPaiement[0], Validators.required],
      tauxTVAGlobal: [0],
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

      // 🔹 TVA globale
      this.panierForm.get('tauxTVAGlobal')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.synchroniserFormulaireVersModele();
          this.recalculerPanierComplet();
        });

      // 🔹 Remise globale
      this.panierForm.get('remiseGlobale')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.synchroniserFormulaireVersModele();
          this.recalculerPanierComplet();
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

    /* if (changes['panierData']?.currentValue && !this.isFormDisabled) {
      if(this.panierData) this.chargerPanierExistant(this.panierData);
    } */

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
      //methodePaiement: '',
      tauxTVAGlobal:0,
      tvaParArticle: this.tvaParArticle,
      remiseParArticle: this.remiseParArticle
    });

    this.panierArray.clear();
    this.searchInput = '';
    this.filteredProduits = [];
    this.isFormDisabled = false;
    this.ispanierValid = false;

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

// Filtrer les articles sans produitId
  const articlesValides = tousLesArticles.filter(article => {
    const hasProduitId = !!(article.produitId || article.Produit?.id);
    if (!hasProduitId) {
      console.warn('Article invalide filtré:', article);
    }
    return hasProduitId;
  });
  
  if (articlesValides.length !== tousLesArticles.length) {
    console.warn(`${tousLesArticles.length - articlesValides.length} article(s) sans produitId filtrés`);
  }

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
    tauxTVAGlobal: panier.tauxTVA || 0,
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

   // Vérifier l'état après chargement
  setTimeout(() => {
    this.verifierEtCorrigerEtatFormulaire();
  }, 300);

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
    article.calculerTotaux(
    this.panier.tvaParArticle,
    this.panier.remiseParArticle,
    this.panier.tauxTVA,
    this.panier.remiseGlobale
  );
    this.panier.ajouterArticle(article);
    this.panier.calculerTotals();
    this.synchroniserModeleVersFormulaire();

    if (this.panierBrouillon?.id) {
      this.ajouterArticleEnBase(article);
    }
  }

  // === SYNCHRONISATION MODÈLE/FORMULAIRE ===

  private synchroniserFormulaireVersModele(): void {
  // Récupération sécurisée des valeurs du formulaire
  const raw = this.panierForm.getRawValue();

  // 🔒 NORMALISATION DES VALEURS NUMÉRIQUES
  const remiseGlobale = Number(raw.remiseGlobale);
  const tauxTVAGlobal = Number(raw.tauxTVAGlobal);
  const avance = Number(raw.avance);

  // 🔹 Remise globale
  // '' | null | undefined | NaN  ==> 0
  this.panier.remiseGlobale = !isNaN(remiseGlobale) && remiseGlobale >= 0
    ? remiseGlobale
    : 0;

  // 🔹 TVA globale
  this.panier.tauxTVA = !isNaN(tauxTVAGlobal) && tauxTVAGlobal >= 0
    ? tauxTVAGlobal
    : 0;

  // 🔹 Modes de calcul
  this.panier.remiseParArticle = !!raw.remiseParArticle;
  this.panier.tvaParArticle = !!raw.tvaParArticle;

  // 🔹 Avance
  this.panier.avance = !isNaN(avance) && avance >= 0
    ? avance
    : 0;

  // 🔄 Recalcul COMPLET du panier
  this.panier.calculerTotals();

  // 📢 Émission du total TTC
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

    if (!article.produitId) {
      console.error('❌ Article sans produitId détecté:', article);
      throw new Error(`Article invalide: produitId manquant pour ${article.produit?.designation || 'article inconnu'}`);
    }
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
  // === GESTION DES MODES TVA/REMISE ===

  private onTVAModeChange(tvaParArticle: boolean): void {
    this.panier.tvaParArticle = tvaParArticle;
    this.showTVAFields = tvaParArticle;
    this.mettreAJourEtatChampsTVA();
    this.recalculerPanierComplet();
  }

  private onRemiseModeChange(remiseParArticle: boolean): void {
    this.panier.remiseParArticle = remiseParArticle;
    this.showRemiseFields = remiseParArticle;
    this.mettreAJourEtatChampsRemise();
    this.recalculerPanierComplet();
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

  private recalculerPanierComplet(): void {
  this.panier.articles.forEach(article => {
    article.calculerTotaux(
      this.panier.tvaParArticle,
      this.panier.remiseParArticle,
      this.panier.tauxTVA,
      this.panier.remiseGlobale
    );
  });

  this.panier.calculerTotals();
  this.synchroniserModeleVersFormulaire();
  this.totalPanierChange.emit(this.panier.totalTTC);
}

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

    /* if (this.panierBrouillon?.id) {
      //this.mettreAJourPanierEnBase();
      this.mettreAJourPanierEnBaseAvecStatut('validé');
    } */
     console.log('✅ Panier validé', {
      statut: this.panier.statut,
      totalTTC: this.panier.totalTTC
    });
  }
  else {
    console.error('❌ Panier invalide, impossible de valider');
  }
}

private mettreAJourPanierEnBaseAvecStatut(statut: 'en_cours' | 'validé' | 'annulé' | 'retourné'): void {
  if (!this.panierBrouillon?.id) return;

  console.log(`🔄 Mise à jour statut panier en BD: ${statut}`);
  
  // 1. Préparer le panier avec TOUS les totaux
  const panierAMettreAJour = this.preparePanierForDB(statut);
  
  console.log('📤 Panier envoyé à l\'API:', {
    id: panierAMettreAJour.id,
    statut: panierAMettreAJour.statut,
    totalHT: panierAMettreAJour.totalHT,
    totalTTC: panierAMettreAJour.totalTTC,
    articles: panierAMettreAJour.articles.map(a => ({
      id: a.id,
      produit: a.produit?.designation,
      quantite: a.quantite,
      prixUnitaire: a.prixUnitaire,
      totalHT: a.totalHT,
      montantRemise: a.montantRemise,
      montantTVA: a.montantTVA,
      totalTTC: a.totalTTC
    }))
  });
  
  this.panierService.updatePanier(this.panierBrouillon.id, panierAMettreAJour)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (panierMisAJour) => {
        console.log(`✅ Statut panier mis à jour en BD: ${panierMisAJour.statut}`);
        console.log('📥 Panier reçu de l\'API:', {
          totalHT: panierMisAJour.totalHT,
          totalTTC: panierMisAJour.totalTTC,
          articles: panierMisAJour.tousLesArticles?.map(a => ({
            id: a.id,
            produit: a.produit?.designation,
            totalHT: a.totalHT,
            montantRemise: a.montantRemise,
            montantTVA: a.montantTVA,
            totalTTC: a.totalTTC
          }))
        });
        
        // Mettre à jour le panier brouillon local
        this.panierBrouillon = panierMisAJour;
        
        // Synchroniser le statut dans le modèle local
        this.panier.statut = panierMisAJour.statut;
      },
      error: (err) => {
        console.error('❌ Erreur mise à jour statut panier:', err);
        console.error('Détails erreur:', err.error);
        
        // En cas d'erreur, revenir à l'état précédent
        if (statut === 'validé') {
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
  /* if (this.panierBrouillon?.id) {
    this.mettreAJourPanierEnBaseAvecStatut('en_cours');
  } */
  
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
  console.log('🔍 Vérification activation mode TVA global');
  
  // 1. Si le formulaire est désactivé, on ne peut rien changer
  if (this.isFormDisabled) {
    console.log('❌ Mode global impossible: formulaire désactivé');
    return true; // Désactive le bouton radio
  }
  
  // 2. Si déjà en mode global, on peut rester en global
  if (this.tvaRadioValue === 'global') {
    console.log('✅ Mode global déjà activé');
    return false; // Bouton NON désactivé
  }
  
  // 3. Si pas d'articles, on peut choisir n'importe quel mode
  if (this.panierArray.length === 0) {
    console.log('✅ Mode global activable: panier vide');
    return false; // Bouton NON désactivé
  }
  
  // 4. Vérifier si des articles ont des TVA personnalisées (> 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articlesAvecTvaPersonnalisee :any = [];
  
  this.panierArray.controls.forEach((articleGroup, index) => {
    const tauxTVA = articleGroup.get('tauxTVA')?.value;
    const produit = articleGroup.get('produit')?.value;
    
    // Important: convertir en nombre et vérifier
    const tauxNumerique = parseFloat(tauxTVA) || 0;
    
    if (tauxNumerique > 0) {
      articlesAvecTvaPersonnalisee.push({
        index,
        produit,
        tauxTVA: tauxNumerique
      });
    }
  });
  
  console.log('📊 Articles avec TVA personnalisée:', articlesAvecTvaPersonnalisee);
  
  // 5. Si AUCUN article n'a de TVA personnalisée, on peut passer en global
  if (articlesAvecTvaPersonnalisee.length === 0) {
    console.log('✅ Mode global activable: aucun article avec TVA personnalisée');
    return false; // Bouton NON désactivé
  }
  
  // 6. Articles avec TVA personnalisée existent, vérifier si c'est le même taux
  if (articlesAvecTvaPersonnalisee.length > 0) {
    const premierTaux = articlesAvecTvaPersonnalisee[0].tauxTVA;
    const tousMemeTaux = articlesAvecTvaPersonnalisee.every(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (article:any) => article.tauxTVA === premierTaux
    );
    
    if (tousMemeTaux) {
      console.log(`✅ Mode global activable: tous les articles ont la même TVA (${premierTaux}%)`);
      return false; // Bouton NON désactivé
    }
  }
  
  // 7. Articles avec TVA différentes > 0, on ne peut PAS passer en global
  console.log('❌ Mode global impossible: articles avec TVA différentes');
  return true; // Désactive le bouton radio
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
    //this.panierForm.get('methodePaiement')?.disable();
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
    //this.panierForm.get('methodePaiement')?.enable();
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
      code_structure: this.panierBrouillon.code_structure,
      // Recalculer les totaux avant envoi
      montantRemise: article.montantRemise || 0,
      montantTVA: article.montantTVA || 0,
      totalHT: article.totalHT || 0,
      totalTTC: article.totalTTC || 0
    });

    console.log('📤 Ajout article en BD:', {
      produit: articleASauvegarder.produit?.designation,
      totalHT: articleASauvegarder.totalHT,
      totalTTC: articleASauvegarder.totalTTC
    });

    this.articlesPanierService.create(articleASauvegarder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (articleSauvegarde) => {
          console.log('✅ Article ajouté en BD:', {
            id: articleSauvegarde.id,
            totalHT: articleSauvegarde.totalHT,
            totalTTC: articleSauvegarde.totalTTC
          });
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
    produitId: article.produitId || article.Produit?.id,
    
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
  }

  // === MÉTHODES PRÉSENTES DANS L'ANCIEN CODE MAIS MANQUANTES ===

  private preparePanierForDB(statut: 'en_cours' | 'validé' | 'annulé' | 'retourné'): Panier {
  console.log('💾 Préparation du panier pour la base de données, statut:', statut);
  
  // 1. Recréer le panier avec tous les champs
  const panierPourBD = new Panier({
    id: this.panier.id,
    clientId: this.panier.clientId,
    bonId: this.panier.bonId,
    // Copier explicitement tous les champs
    totalHT: this.panier.totalHT,
    tva: this.panier.tva,
    totalTTC: this.panier.totalTTC,
    remiseGlobale: this.panier.remiseGlobale,
    remise: this.panier.remise,
    avance: this.panier.avance,
    //methodePaiement: this.panier.methodePaiement,
    tauxTVA: this.panier.tauxTVA,
    typePanier: this.panier.typePanier,
    typeEntite: this.panier.typeEntite,
    code_structure: this.panier.code_structure,
    statut: statut, // <-- Utiliser le statut passé en paramètre
    dateCreation: this.panier.dateCreation,
    dateMiseAJour: new Date(),
    magasinId: this.panier.magasinId,
    agentId: this.panier.agentId,
    remiseParArticle: this.panier.remiseParArticle,
    tvaParArticle: this.panier.tvaParArticle
  });
  
  // 2. Recréer les articles avec TOUS les totaux
  panierPourBD.articles = this.panier.articles.map(article => {
    // Créer une copie complète de l'article
    const articlePourBD = new ArticlePanier({
      id: article.id,
      produitId: article.produitId || article.Produit?.id,
      panierId: this.panierBrouillon?.id,
      produit: article.produit,
      Produit: article.Produit,
      prixUnitaire: article.prixUnitaire,
      quantite: article.quantite,
      prixVenteUnitaire: article.prixVenteUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire,
      code_structure: article.code_structure,
      stock: article.stock,
      remise: article.remise,
      tauxTVA: article.tauxTVA,
      // CHAMPS CALCULÉS - IMPORTANT !
      montantTVA: article.montantTVA,
      montantRemise: article.montantRemise,
      totalHT: article.totalHT,
      totalTTC: article.totalTTC
    });
    
    console.log('📦 Article préparé pour BD:', {
      produit: articlePourBD.produit?.designation,
      quantite: articlePourBD.quantite,
      prixUnitaire: articlePourBD.prixUnitaire,
      totalHT: articlePourBD.totalHT,
      montantRemise: articlePourBD.montantRemise,
      montantTVA: articlePourBD.montantTVA,
      totalTTC: articlePourBD.totalTTC
    });
    
    return articlePourBD;
  });
  
  // 3. Recalculer une dernière fois pour être sûr
  panierPourBD.calculerTotals();
  
  console.log('✅ Panier préparé pour BD:', {
    statut: panierPourBD.statut,
    totalHT: panierPourBD.totalHT,
    totalTTC: panierPourBD.totalTTC,
    tva: panierPourBD.tva,
    remise: panierPourBD.remise,
    articlesCount: panierPourBD.articles.length,
    articlesTotaux: panierPourBD.articles.map(a => ({
      produit: a.produit?.designation,
      totalHT: a.totalHT,
      totalTTC: a.totalTTC
    }))
  });
  
  return panierPourBD;
}

  private verifierEtCorrigerEtatFormulaire(): void {
    // Délai pour s'assurer que tout est chargé
    setTimeout(() => {
      console.log('🔍 Vérification état formulaire:', {
        isFormDisabled: this.isFormDisabled,
        panierStatut: this.panier?.statut,
        panierBrouillonStatut: this.panierBrouillon?.statut,
        panierArrayLength: this.panierArray?.length
      });
      
      // Si le formulaire est désactivé mais devrait être activé
      if (this.isFormDisabled && 
          this.panier?.statut === 'en_cours' && 
          this.panierArray?.length > 0) {
        console.log('⚠️ Correction automatique : formulaire devrait être activé');
        this.isFormDisabled = false;
        this.activerControlesFormulaire();
        this.cdr.detectChanges();
      }
      
      // Si le formulaire est activé mais devrait être désactivé
      if (!this.isFormDisabled && 
          this.panier?.statut === 'validé') {
        console.log('⚠️ Correction automatique : formulaire devrait être désactivé');
        this.isFormDisabled = true;
        this.desactiverControlesFormulaire();
        this.cdr.detectChanges();
      }
    }, 200);
  }

}