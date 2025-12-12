import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Produits } from '../../modeles/produit.modele';
import { Bon, BonAvecFichier } from '../../modeles/bon.model';
import { Panier } from '../../modeles/panier.model';
import { PanierComponent } from '../panier/panier.component';
import { BonBrouillonService } from '../../services/bon-brouillon.service';
import { BonsService } from '../../services/bons.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-bons',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, PanierComponent],
  templateUrl: './bons.component.html',
  styleUrl: './bons.component.css'
})
export class BonsComponent implements OnChanges,OnInit {

  @Input() produitsDisponibles: Produits[] = [];
  @Input() showBonForm = false;
  @Input() typeEntite: 'client' | 'fournisseur' = 'fournisseur';
  @Input() entiteId?: number;
  @Input() entiteNom?: string;
  @Input() showFileField = true;
  @Input() resetForm = false;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerBon = new EventEmitter<BonAvecFichier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onErreurEnregistrement = new EventEmitter<string>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onReinitialiserPanier = new EventEmitter<void>();

  // Variables pour les tabs
  activeTab: 'informations' | 'articles' | 'paiement' | 'logistique' = 'informations';

  // Variables pour suivre les tabs accessibles
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  accessibleTabs: { [key: string]: boolean } = {
    informations: true,
    articles: false,
    paiement: false,
    logistique: false
  };

  // Formulaires
  bonForm!: FormGroup;
  informationsForm!: FormGroup;
  logistiqueForm!: FormGroup;

  // Variables générales
  currentDate: string = new Date().toLocaleDateString();
  currentTime: string = new Date().toLocaleTimeString();
  generatedNumero: string = this.generateNumero();
  typeBon = '';
  panierDisabled = false;
  totalPanier = 0;
  showBonButtons = false;

  // Fichiers
  maxFileSize = 10 * 1024 * 1024; // 10MB
  fichierSelectionne: File | null = null;

  // Validations
  erreurs: string[] = [];
  modeMontant: 'saisi' | 'mixte' | 'panier' = 'panier';

  // Panier
  resetPanierTrigger = false;
  showPanier = true;
  panierData: Panier | null = null;

  today: string = new Date().toISOString().split('T')[0];

  // Brouillons
  bonBrouillon: Bon | null = null;

  // Conditions de paiement prédéfinies
  conditionsPaiementOptions = [
    '30 jours fin de mois',
    '60 jours',
    '45 jours',
    'Paiement à réception',
    '50% à la commande, 50% à la livraison',
    'Paiement comptant'
  ];

  
  // Services
  private fb = inject(FormBuilder);
  private bonBrouillonService = inject(BonBrouillonService);
  private bonService = inject(BonsService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.updateTime();
    this.initForms();
    this.setupSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetForm'] && changes['resetForm'].currentValue === true) {
      this.reinitialiserFormulaire();
    }
  }

  private initForms(): void {
    // Formulaire principal du bon
    this.bonForm = this.fb.group({
      // Informations générales
      type: ['commande', Validators.required],
      description: [''],
      referenceExterne: [''],
      numeroBonOrigine: [''],
      motifsRetour: [''],
      montantAvoir: [0, [Validators.min(0)]],

      // Montants
      remise: [0, [Validators.min(0)]],
      avance: [0, [Validators.min(0)]],

      // Conditions de paiement
      conditionsPaiement: ['30 jours fin de mois'],
      delaiPaiement: [30, [Validators.min(0)]],

      // TVA
      tauxTVA: [18, [Validators.min(0), Validators.max(100)]]
    });

    // Formulaire de logistique
    this.logistiqueForm = this.fb.group({
      dateLivraisonPrevue: [''],
      pointLivraison: [''],
      transporteur: ['']
    });
  }

  private setupSubscriptions(): void {
    // S'abonner aux brouillons
    this.bonBrouillonService.bonBrouillon$.subscribe(bon => {
      this.bonBrouillon = bon;
      if (bon) {
        this.chargerBonBrouillon(bon);
      }
    });

    // Écouter les changements pour validation en temps réel
    this.bonForm.valueChanges.subscribe(() => {
      this.validerMontants();
      this.updateTabAccessibility();
    });

    // Écouter spécifiquement les changements de type
    this.bonForm.get('type')?.valueChanges.subscribe(nouveauType => {
      if (this.bonBrouillon && nouveauType) {
        // Utiliser debounceTime pour éviter trop d'appels
        setTimeout(() => {
          this.updateTypeBonInBD(nouveauType);
        }, 300);
      }
    });
  }

  private chargerBonBrouillon(bon: Bon): void {
    this.generatedNumero = bon.numero;
    
    // Charger les données dans les formulaires
    this.bonForm.patchValue({
      type: bon.type?.toLowerCase(),
      description: bon.description,
      referenceExterne: bon.referenceExterne,
      numeroBonOrigine: bon.numeroBonOrigine,
      motifsRetour: bon.motifsRetour,
      montantAvoir: bon.montantAvoir || 0,
      remise: bon.remise || 0,
      avance: bon.avance || 0,
      conditionsPaiement: bon.conditionsPaiement || '30 jours fin de mois',
      delaiPaiement: bon.delaiPaiement || 30,
    });

    // Charger la logistique si disponible
    if (bon.dateLivraisonPrevue || bon.pointLivraison || bon.transporteur) {
      this.logistiqueForm.patchValue({
        dateLivraisonPrevue: bon.dateLivraisonPrevue ? 
          new Date(bon.dateLivraisonPrevue).toISOString().split('T')[0] : '',
        pointLivraison: bon.pointLivraison || '',
        transporteur: bon.transporteur || ''
      });
    }

    // Activer le bon type
    this.onTypeBonChange();
  }

  // Méthode pour mettre à jour l'accessibilité des tabs
  private updateTabAccessibility(): void {
    // Tab Informations est toujours accessible
    // Tab Informations est toujours accessible
    this.accessibleTabs['informations'] = true;
    
    // Tab Articles accessible si les infos sont valides
    // Tab Articles accessible si les infos sont valides
    this.accessibleTabs['articles'] = this.isInformationsTabValid();
    
    // Tab Paiement accessible si les articles sont valides
    // Tab Paiement accessible si les articles sont valides
    this.accessibleTabs['paiement'] = this.isArticlesTabValid();
    
    // Tab Logistique accessible si le paiement est valide
    // Tab Logistique accessible si le paiement est valide
    this.accessibleTabs['logistique'] = this.isPaiementTabValid();
  }

   // Validation de l'onglet Informations
  private isInformationsTabValid(): boolean {
    if (!this.bonForm.get('type')?.valid) {
      return false;
    }
    
    // Validation spécifique pour les retours
    if (this.typeBon === 'retour') {
      const numeroBonOrigineValid = this.bonForm.get('numeroBonOrigine')?.valid || false;
      const motifsRetourValid = this.bonForm.get('motifsRetour')?.valid || false;
      return numeroBonOrigineValid && motifsRetourValid;
    }
    
    return true;
  }

  // Validation de l'onglet Articles
  private isArticlesTabValid(): boolean {
    if (this.typeBon === 'retour') {
      // Pour un retour, soit des articles, soit un montant
      const hasArticles = this.panierData && this.panierData.articles.length > 0;
      const montantAvoir = this.bonForm.get('montantAvoir')?.value || 0;
      return hasArticles || montantAvoir > 0;
    } else {
      // Pour les autres types, des articles sont requis
      return this.panierData !== null && this.panierData.articles.length > 0;
    }
  }

  // Validation de l'onglet Paiement
  private isPaiementTabValid(): boolean {
    if (this.typeBon === 'retour') {
      return true; // Pas de validation spécifique pour les retours
    }
    
    const avance = this.bonForm.get('avance')?.value || 0;
    const totalTTC = this.totalTTC;
    
    // L'avance ne doit pas dépasser le total
    return avance <= totalTTC;
  }

  // Gestion des tabs
  setActiveTab(tab: 'informations' | 'articles' | 'paiement' | 'logistique'): void {
    /* this.activeTab = tab;
    
    // Si on passe à l'onglet articles, on montre le panier
    if (tab === 'articles') {
      this.showPanier = true;
    } */
   if (this.activeTab === 'articles' && this.panierData) {
      this.sauvegarderEtatPanier();
    }
   // Ne permettre le changement que si le tab est accessible
    if (this.accessibleTabs[tab]) {
      // Restaurer l'état du panier si on revient à l'onglet articles
      if (tab === 'articles' && !this.panierData) {
        const panierRestore = this.restaurerEtatPanier();
        if (panierRestore) {
          this.panierData = panierRestore;
        }
      }
      this.activeTab = tab;
      
      if (tab === 'articles') {
        this.showPanier = true;
      }
      
      this.cdr.detectChanges();
    } else {
      // Afficher un message d'erreur si l'utilisateur essaie d'accéder à un tab non accessible
      this.toastr.warning(`Veuillez d'abord valider l'étape actuelle avant de passer à ${tab}`, 'Étape non terminée');
    }
  }

  // Getter pour déterminer si on peut passer à l'onglet suivant
  get canGoToNextTab(): boolean {
    /* switch (this.activeTab) {
      case 'informations':
        return this.bonForm.get('type')?.valid || false;
      case 'articles':
        return !! this.panierData?.articles?.length;
      case 'paiement':
        return this.bonForm.get('avance')?.valid || false;
      default:
        return true;
    } */
    switch (this.activeTab) {
      case 'informations':
        return this.validateInformationsTab();
      case 'articles':
        return this.validateArticlesTab();
      case 'paiement':
        return this.validatePaiementTab();
      default:
        return true;
    }
  }
  // Getter pour déterminer si on peut revenir à l'onglet précédent
  get canGoToPreviousTab(): boolean {
    // eslint-disable-next-line @typescript-eslint/array-type
    const tabs: Array<'informations' | 'articles' | 'paiement' | 'logistique'> = 
      ['informations', 'articles', 'paiement', 'logistique'];
    
    const currentIndex = tabs.indexOf(this.activeTab);
    return currentIndex > 0;
  }

  // Navigation entre tabs
  nextTab(): void {
    // eslint-disable-next-line @typescript-eslint/array-type
    const tabs: Array<'informations' | 'articles' | 'paiement' | 'logistique'> = 
      ['informations', 'articles', 'paiement', 'logistique'];
    
    const currentIndex = tabs.indexOf(this.activeTab);
    if (currentIndex < tabs.length - 1) {
      //this.activeTab = tabs[currentIndex + 1];
      const nextTab = tabs[currentIndex + 1];
      // Valider l'étape actuelle avant de passer à la suivante
      if (this.validateCurrentTab()) {
        this.accessibleTabs[nextTab] = true;
        this.activeTab = nextTab;
      }
    }
  }

  previousTab(): void {
    // eslint-disable-next-line @typescript-eslint/array-type
    const tabs: Array<'informations' | 'articles' | 'paiement' | 'logistique'> = 
      ['informations', 'articles', 'paiement', 'logistique'];
    
    const currentIndex = tabs.indexOf(this.activeTab);
    if (currentIndex > 0) {
      //this.activeTab = tabs[currentIndex - 1];
      const previousTab = tabs[currentIndex - 1];
      this.activeTab = previousTab;
    }
  }

  // Validation de l'onglet actuel
  private validateCurrentTab(): boolean {
    switch (this.activeTab) {
      case 'informations':
        return this.validateInformationsTab();
      case 'articles':
        return this.validateArticlesTab();
      case 'paiement':
        return this.validatePaiementTab();
      default:
        return true;
    }
  }
  private validateInformationsTab(): boolean {
    if (!this.bonForm.get('type')?.valid) {
      //this.toastr.error('Veuillez sélectionner un type de bon', 'Erreur de validation');
      this.bonForm.get('type')?.markAsTouched();
      return false;
    }
    
    if (this.typeBon === 'retour') {
      const numeroBonOrigine = this.bonForm.get('numeroBonOrigine');
      const motifsRetour = this.bonForm.get('motifsRetour');
      
      if (!numeroBonOrigine?.valid) {
        //this.toastr.error('Le numéro du bon d\'origine est requis pour un retour', 'Erreur de validation');
        numeroBonOrigine?.markAsTouched();
        return false;
      }
      
      if (!motifsRetour?.valid) {
        //this.toastr.error('Veuillez détailler les motifs du retour (minimum 10 caractères)', 'Erreur de validation');
        motifsRetour?.markAsTouched();
        return false;
      }
    }
    
    return true;
  }

  private validateArticlesTab(): boolean {
    if (this.typeBon === 'retour') {
      const hasArticles = this.panierData && this.panierData.articles.length > 0;
      const montantAvoir = this.bonForm.get('montantAvoir')?.value || 0;
      
      if (!hasArticles && montantAvoir <= 0) {
        //this.toastr.error('Pour un retour, veuillez ajouter des articles ou spécifier un montant d\'avoir', 'Erreur de validation');
        return false;
      }
      
      return true;
    } else {
      if (!this.panierData || this.panierData.articles.length === 0) {
        //this.toastr.error('Veuillez ajouter au moins un article au panier', 'Erreur de validation');
        return false;
      }
      
      return true;
    }
  }

  private validatePaiementTab(): boolean {
    if (this.typeBon === 'retour') {
      return true;
    }
    
    const avance = this.bonForm.get('avance')?.value || 0;
    const totalTTC = this.totalTTC;
    
    if (avance > totalTTC) {
      this.toastr.error(`L'avance (${avance} F CFA) ne peut pas dépasser le total TTC (${totalTTC} F CFA)`, 'Erreur de validation');
      return false;
    }
    
    return true;
  }

  updateTypeBonInBD(type: 'commande' | 'livraison' | 'retour' | 'avoir' | 'vente' | 'achat'): void {
  if (!this.bonBrouillon) return;
  
  console.log('Mise à jour du type de bon:', { bonId: this.bonBrouillon.id, nouveauType: type });
  
  this.bonService.updateTypetBon(this.bonBrouillon.id!, type)
    .subscribe({
      next: (updatedBon) => {
        console.log('Type de bon mis à jour avec succès', updatedBon);
        // Vérifier que le type est bien présent
        if (updatedBon.type) {
          console.log('Nouveau type:', updatedBon.type);
          // Mettre à jour le brouillon local
          this.bonBrouillon = { ...(this.bonBrouillon as Bon), type: updatedBon.type };
        } else {
          console.warn('Le type n\'est pas défini dans la réponse');
          // Mettre quand même à jour localement
          this.bonBrouillon = { ...(this.bonBrouillon as Bon), type };
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du type de bon', err);
      }
    });
}

  // Méthodes existantes avec améliorations
  onTypeBonChange(): void {
    const nouveauType = this.bonForm.get('type')?.value;
    this.typeBon = nouveauType;

    // Mettre à jour en base de données
    if (this.bonBrouillon) {
      this.updateTypeBonInBD(nouveauType);
    }

    // Réinitialiser les champs selon le type
    if (this.typeBon === 'retour') {
      this.bonForm.patchValue({
        remise: 0,
        avance: 0,
        tauxTVA: 0
      });
      this.modeMontant = 'mixte';
      this.showFileField = false;
      // Ajouter des validateurs pour les retours
      this.bonForm.get('numeroBonOrigine')?.setValidators([Validators.required]);
      this.bonForm.get('motifsRetour')?.setValidators([Validators.required, Validators.minLength(10)]);
    } 
    else {
      this.modeMontant = 'panier';
      this.showFileField = true;
      // Retirer les validateurs pour les retours
      this.bonForm.get('numeroBonOrigine')?.clearValidators();
      this.bonForm.get('motifsRetour')?.clearValidators();
    }

    // Ajuster les champs requis selon le type
    //this.adjustValidatorsForType();
    this.bonForm.get('numeroBonOrigine')?.updateValueAndValidity();
    this.bonForm.get('motifsRetour')?.updateValueAndValidity();
    
    // Réinitialiser l'accessibilité des tabs
    this.resetTabAccessibility();
  }

  

  private resetTabAccessibility(): void {
    this.accessibleTabs = {
      informations: true,
      articles: false,
      paiement: false,
      logistique: false
    };
    
    if (this.activeTab !== 'informations') {
      this.activeTab = 'informations';
    }
  }
  private adjustValidatorsForType(): void {
    const montantAvoirControl = this.bonForm.get('montantAvoir');
    const numeroBonOrigineControl = this.bonForm.get('numeroBonOrigine');
    const motifsRetourControl = this.bonForm.get('motifsRetour');

    if (this.typeBon === 'retour') {
      montantAvoirControl?.setValidators([Validators.required, Validators.min(0)]);
      numeroBonOrigineControl?.setValidators([Validators.required]);
      motifsRetourControl?.setValidators([Validators.required, Validators.minLength(10)]);
    } else {
      montantAvoirControl?.clearValidators();
      numeroBonOrigineControl?.clearValidators();
      motifsRetourControl?.clearValidators();
    }

    montantAvoirControl?.updateValueAndValidity();
    numeroBonOrigineControl?.updateValueAndValidity();
    motifsRetourControl?.updateValueAndValidity();
  }

  // Calcul des totaux amélioré
  get montantBase(): number {
    if (this.modeMontant === 'panier') {
      return this.totalPanier;
    } /* else if (this.modeMontant === 'saisi') {
      return this.bonForm.get('montant')?.value || 0;
    } */ 
   else if (this.modeMontant === 'mixte') {
      if (this.panierData && this.panierData.articles.length > 0) {
        return this.totalPanier;
      } else {
        return this.bonForm.get('montantAvoir')?.value || 0;
      }
    }
    return 0;
  }

  get montantHT(): number {
    const remise = this.bonForm.get('remise')?.value || 0;
     if (this.typeBon === 'retour') {
      return 0;
    }
    const base = this.montantBase;
    return Math.max(0, base - remise);
  }

  get montantTVA(): number {
    // Utiliser la TVA du panier si disponible
  if (this.panierData?.tva !== undefined) {
    return this.panierData.tva;
  }
    //const taux = this.bonForm.get('tauxTVA')?.value || 0;
    // Fallback si pas de panier
    const taux = this.panierData?.tauxTVA || this.bonForm.get('tauxTVA')?.value || 0;
    return this.montantHT * (taux / 100);
  }

  get totalTTC(): number {
    
    if (this.typeBon === 'retour') {
      return 0;
    }
    // Utiliser le total TTC du panier si disponible
    if (this.panierData?.totalTTC !== undefined) {
      return this.panierData.totalTTC;
    }
    return this.montantHT + this.montantTVA;
  }

  // Ajouter un getter pour le taux TVA du panier
  get tauxTVA(): number {
    return this.panierData?.tauxTVA || 0;
  }
  get resteAPayer(): number {
    const total = this.montantHT; //this.totalBon;
    const avance = this.bonForm.get('avance')?.value || 0;
    return Math.max(0, total - avance);
  }

  /* get totalBon(): number {
    if (this.typeBon === 'retour') {
      return 0;
    }
    return this.totalTTC;
  } */

  // Validation améliorée
  validerMontants(): void {
    this.erreurs = [];
    const montant = this.montantBase;
    const remise = this.bonForm.get('remise')?.value || 0;
    const avance = this.bonForm.get('avance')?.value || 0;

    // Validation de la remise
    if (remise > montant) {
      this.erreurs.push(`La remise (${remise} F CFA) ne peut pas dépasser le montant du bon (${montant} F CFA)`);
    }

    // Validation de l'avance
    const montantApresRemise = montant - remise;
    if (avance > montantApresRemise) {
      this.erreurs.push(`L'avance (${avance} F CFA) ne peut pas dépasser le montant après remise (${montantApresRemise} F CFA)`);
    }

    // Validation du taux TVA
    const tauxTVA = this.tauxTVA;
    if (tauxTVA < 0 || tauxTVA > 100) {
      this.erreurs.push(`Le taux TVA doit être compris entre 0 et 100%`);
    }
  }

  // Dans BonComponent
private sauvegarderEtatPanier(): void {
  // Cette méthode est appelée avant de quitter l'onglet articles
  if (this.panierData) {
    // Sauvegarder l'état dans le localStorage ou dans une variable
    localStorage.setItem('panier_temp', JSON.stringify(this.panierData));
  }
}

private restaurerEtatPanier(): Panier | null {
  const panierSauvegarde = localStorage.getItem('panier_temp');
  if (panierSauvegarde) {
    try {
      return JSON.parse(panierSauvegarde) as Panier;
    } catch (e) {
      console.error('Erreur lors de la restauration du panier:', e);
    }
  }
  return null;
}
  // Préparation des données améliorée
  prepareBonData(): { bon: Bon, fichier: File | null } {
    const formValue = this.bonForm.value;
    const logistiqueValue = this.logistiqueForm.value;

    
    const baseData = {
      numero: this.generatedNumero,
      type: formValue.type,
      description: formValue.description,
      referenceExterne: formValue.referenceExterne,
      typeEntite: this.typeEntite,
      // eslint-disable-next-line @typescript-eslint/prefer-as-const
      statutBon: 'validé'as 'validé',
      dateBon: new Date(),
      panier: this.panierData || undefined,
      conditionsPaiement: formValue.conditionsPaiement,
      delaiPaiement: formValue.delaiPaiement
    };

    // Pour les retours
    if (this.typeBon === 'retour') {
      const bonRetour = new Bon({
        ...baseData,
        numeroBonOrigine: formValue.numeroBonOrigine,
        motifsRetour: formValue.motifsRetour,
        montantAvoir: this.montantBase,
        montantTotal: 0,
        remise: 0,
        avance: 0,
        netAPayer: 0,
        resteAPayer: 0,
      });

      // Ajouter les informations de logistique si fournies
      if (logistiqueValue.dateLivraisonPrevue) {
        bonRetour.dateLivraisonPrevue = new Date(logistiqueValue.dateLivraisonPrevue);
      }
      bonRetour.pointLivraison = logistiqueValue.pointLivraison;
      bonRetour.transporteur = logistiqueValue.transporteur;

      return { bon: bonRetour, fichier: this.fichierSelectionne };
    }

    // Pour les autres types de bon
    const bonStandard = new Bon({
      ...baseData,
      montantTotal: this.montantBase,
      montantAvoir: 0,
      remise: formValue.remise || 0,
      avance: formValue.avance || 0,
      netAPayer: this.totalTTC,
      resteAPayer: this.resteAPayer,
    });

    // Ajouter les informations de logistique
    if (logistiqueValue.dateLivraisonPrevue) {
      bonStandard.dateLivraisonPrevue = new Date(logistiqueValue.dateLivraisonPrevue);
    }
    bonStandard.pointLivraison = logistiqueValue.pointLivraison;
    bonStandard.transporteur = logistiqueValue.transporteur;

    // Associer l'entité (client ou fournisseur)
    if (this.typeEntite === 'client' && this.entiteId) {
      bonStandard.clientId = this.entiteId;
    } else if (this.typeEntite === 'fournisseur' && this.entiteId) {
      bonStandard.fournisseurId = this.entiteId;
    }

    return { bon: bonStandard, fichier: this.fichierSelectionne };
  }

  // Soumission du bon
  submitBon(): void {
    // Valider tous les formulaires
    if (!this.bonForm.valid || !this.logistiqueForm.valid) {
      this.bonForm.markAllAsTouched();
      this.logistiqueForm.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    /* // Validation spécifique selon le type
    if (this.typeBon !== 'retour') {
      if (!this.panierData || this.panierData.articles.length === 0) {
        this.toastr.warning('Veuillez ajouter des articles au panier');
        return;
      }
    } else {
      const montantAvoir = this.bonForm.get('montantAvoir')?.value || 0;
      const hasPanier = this.panierData && this.panierData.articles.length > 0;
      
      if (montantAvoir <= 0 && !hasPanier) {
        this.toastr.warning('Pour un retour, saisissez un montant ou ajoutez des articles');
        return;
      }
    } */

    // Valider chaque étape
    if (!this.validateInformationsTab() || 
        !this.validateArticlesTab() || 
        !this.validatePaiementTab()) {
      this.toastr.warning('Veuillez valider toutes les étapes du formulaire');
      return;
    }

    // Préparer et émettre les données
    const { bon, fichier } = this.prepareBonData();
    bon.statutBon = 'validé';
    
    if (this.bonBrouillon && this.bonBrouillon.id! > 0) {
      bon.id = this.bonBrouillon.id;
    }

    this.onEnregistrerBon.emit({ bon, fichier });
  }

  // Gestion des fichiers (inchangée)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      if (file.size > this.maxFileSize) {
        this.toastr.error(`Le fichier ${file.name} dépasse la taille maximale de 10MB`);
        this.fichierSelectionne = null;
        event.target.value = '';
        return;
      }

      if (!this.isFileTypeValid(file)) {
        this.toastr.error(`Le format ${file.type} n'est pas accepté`);
        this.fichierSelectionne = null;
        event.target.value = '';
        return;
      }

      this.fichierSelectionne = file;
    }
  }

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

  removeFile(): void {
    this.fichierSelectionne = null;
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getFileIcon(file: File): string {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('image')) return '🖼️';
    if (file.type.includes('word')) return '📝';
    return '📎';
  }

  // Gestion du panier
  onPanierEnregistre(panier: Panier): void {
    this.panierData = panier;
    this.showBonButtons = true;
    this.updateTabAccessibility();
    setTimeout(() => {
    this.cdr.detectChanges();
  });
  }

  onPanierAnnule(): void {
    this.panierData = null;
    this.onAnnulerBon.emit();
  }

  onTotalPanierChange(total: number): void {
    this.totalPanier = total;
    this.updateTabAccessibility();
  }

  // Méthodes utilitaires
 /*  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `BON-${timestamp}-${random}`;
  } */

  generateNumero(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  //const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  // identifiant aléatoire 4 chiffres
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `BON-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}


  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }

  reinitialiserFormulaire(): void {
    // Réinitialiser les formulaires
    this.bonForm.reset({
      type: 'commande',
      description: '',
      referenceExterne: '',
      numeroBonOrigine: '',
      motifsRetour: '',
      montantAvoir: 0,
      remise: 0,
      avance: 0,
      conditionsPaiement: '30 jours fin de mois',
      delaiPaiement: 30,
      tauxTVA: 18
    });

    this.logistiqueForm.reset({
      dateLivraisonPrevue: '',
      pointLivraison: '',
      transporteur: ''
    });

    // Réinitialiser les variables
    this.fichierSelectionne = null;
    this.typeBon = '';
    this.generatedNumero = this.generateNumero();
    this.erreurs = [];
    this.modeMontant = 'panier';
    this.panierData = null;
    this.showBonButtons = false;
    this.activeTab = 'informations';
    this.resetPanierTrigger = !this.resetPanierTrigger;

    this.resetTabAccessibility();

    // Réinitialiser l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Émettre l'événement pour réinitialiser le panier
    this.onReinitialiserPanier.emit();
    this.bonBrouillon = null;
  }

  annulerBon(): void {
    const confirmAnnulation = confirm('Annuler l\'enregistrement du bon?');
    if (confirmAnnulation) {
      if (this.bonBrouillon) {
        this.bonService.supprimerBonComplet(this.bonBrouillon.id!)
          .subscribe({
            next: () => {
              this.toastr.success('Brouillon supprimé');
              this.reinitialiserFormulaire();
              this.bonBrouillonService.clearBrouillons();
              this.onAnnulerBon.emit();
            },
            error: (err) => {
              console.error('Erreur suppression brouillon:', err);
              this.toastr.error('Erreur lors de la suppression du brouillon');
            }
          });
      } else {
        this.reinitialiserFormulaire();
        this.onAnnulerBon.emit();
      }
    }
  }

}
