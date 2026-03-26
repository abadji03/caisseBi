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
import { ModePaiement } from '../../modeles/paiement.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-bon',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, PanierComponent],
  templateUrl: './bon.component.html',
  styleUrl: './bon.component.css'
})
export class BonComponent implements OnChanges, OnInit {

  // ==================== INPUTS ====================
  @Input() produitsDisponibles: Produits[] = [];
  @Input() typeEntite: 'client' | 'fournisseur' | 'autre' = 'fournisseur';
  @Input() entiteId?: number;
  @Input() showFileField = true;
  @Input() resetForm = false;
  @Input() generatedNumero!: string;
  @Input() tvaParArticle = true;
  @Input() remiseParArticle = false;

  // ==================== OUTPUTS ====================
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerBon = new EventEmitter<BonAvecFichier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onErreurEnregistrement = new EventEmitter<string>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onReinitialiserPanier = new EventEmitter<void>();

  // ==================== ÉTATS D'AFFICHAGE ====================
  showPanierSection = false;      // Afficher/masquer le panier
  showResumeSection = false;      // Afficher/masquer le récapitulatif
  showFileUpload = true;          // Afficher/masquer l'upload de fichier
  showLogistiqueFields = false;   // Afficher/masquer les champs logistiques

  // ==================== ÉTATS DE VALIDATION ====================
  isFormValid = false;
  isPanierValid = false;
  isFormSubmitting = false;

  // ================= DONNÉES PRINCIPALES ====================
  bonForm!: FormGroup;
  panierData: Panier | null = null;
  bonBrouillon: Bon | null = null;

  // ==================== GESTION DES FICHIERS ====================
  maxFileSize = 10 * 1024 * 1024; // 10MB
  fichierSelectionne: File | null = null;

  // ==================== MESSAGES D'ERREUR ====================
  erreurs: string[] = [];

  // ==================== DONNÉES STATIQUES ====================
  currentDate: string = new Date().toLocaleDateString();
  currentTime: string = new Date().toLocaleTimeString();
  today: string = new Date().toISOString().split('T')[0];
  
  modesPaiement: ModePaiement[] = [
    new ModePaiement({ libelle: 'Espèce' }),
    new ModePaiement({ libelle: 'Carte' }),
    new ModePaiement({ libelle: 'Virement' }),
    new ModePaiement({ libelle: 'Wave' }),
    new ModePaiement({ libelle: 'Orange Money' }),
    new ModePaiement({ libelle: 'Chèque' }),
    new ModePaiement({ libelle: 'Autre' }),
  ];

  conditionsPaiementOptions = [
    '30 jours fin de mois',
    '60 jours',
    '45 jours',
    'Paiement à réception',
    '50% à la commande, 50% à la livraison',
    'Paiement comptant'
  ];

  // ==================== GETTERS ====================
  get typeBon(): 'commande' | 'retour' | 'avoir' | 'livraison' | 'vente' | 'achat' {
    return this.bonForm?.get('type')?.value ?? '';
  }

  get isRetourEtPasAvoir(): boolean {
  return this.typeBon === 'retour' || this.typeBon === 'avoir';
}

  get isRetourOuAvoir(): boolean {
    return this.typeBon === 'retour' || this.typeBon === 'avoir';
  }

  get isCommande(): boolean {
    return this.typeBon === 'commande';
  }

  get isVente(): boolean {
    return this.typeBon === 'vente';
  }

  get montantHT(): number {
    return this.panierData?.totalHT || 0;
  }

  get montantRemise(): number {
    return this.panierData?.remise || 0;
  }

  get montantTVA(): number {
    return this.typeBon === 'retour' ? 0 : (this.panierData?.tva || 0);
  }

  get totalTTC(): number {
    return this.panierData?.totalTTC || 0;
  }

  get avance(): number {
    return this.bonForm?.get('avance')?.value || 0;
  }

  get resteAPayer(): number {
    return Math.max(0, this.totalTTC - this.avance);
  }

  get canEnregistrer(): boolean {
  // Validation des informations du bon
  if (!this.bonForm?.valid) return false;
  
  // Validation du panier selon le type
  if (this.typeBon === 'retour' && !this.isPanierValid) return false;
  if (this.typeBon !== 'retour' && this.typeBon !== 'avoir' && !this.isPanierValid) return false;
  
  // Validation du montant pour l'avoir
  if (this.typeBon === 'avoir') {
    const montantAvoir = this.bonForm.get('montantAvoir')?.value;
    if (!montantAvoir || montantAvoir <= 0) return false;
  }
  
  // Validation des erreurs
  if (this.erreurs.length > 0) return false;
  
  return true;
}

  // ==================== SERVICES ====================
  private fb = inject(FormBuilder);
  private bonBrouillonService = inject(BonBrouillonService);
  private bonService = inject(BonsService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  // ==================== LIFECYCLE ====================
  ngOnInit() {
    this.initForms();
    this.setupSubscriptions();
    this.updateTime();
    this.updateLogistiqueFieldsVisibility();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetForm']?.currentValue === true) {
      this.reinitialiserFormulaire();
    }
    if (changes['typeEntite']) {
      this.updateLogistiqueFieldsVisibility();
    }
  }

  // ==================== INITIALISATION ====================
  private initForms(): void {
    this.bonForm = this.fb.group({
      type: ['commande', Validators.required],
      description: [''],
      referenceExterne: [''],
      numeroBonOrigine: [''],
      motifsRetour: [''],
      montantAvoir: [0],
      avance: [0],
      methodePaiement: [''],
      conditionsPaiement: ['30 jours fin de mois'],
      delaiPaiement: [30],
      dateLivraisonPrevue: [''],
      pointLivraison: [''],
      transporteur: ['']
    });

    // Écouter les changements pour validation
    this.bonForm.valueChanges.subscribe(() => {
      this.validateForm();
      this.updateFileUploadVisibility();
      this.updateLogistiqueFieldsVisibility();
    });
  }

  private setupSubscriptions(): void {
    this.bonBrouillonService.bonBrouillon$.subscribe(bon => {
      this.bonBrouillon = bon;
      if (bon) this.chargerBonBrouillon(bon);
    });
  }

  // ==================== CHARGEMENT BROUILLON ====================
  private chargerBonBrouillon(bon: Bon): void {
    this.generatedNumero = bon.numero;
    
    this.bonForm.patchValue({
      type: bon.type?.toLowerCase(),
      description: bon.description,
      referenceExterne: bon.referenceExterne,
      numeroBonOrigine: bon.numeroBonOrigine,
      motifsRetour: bon.motifsRetour,
      montantAvoir: bon.montantAvoir || 0,
      avance: bon.avance || 0,
      methodePaiement: bon.methodePaiement || this.modesPaiement[0].libelle || '',
      conditionsPaiement: bon.conditionsPaiement || '30 jours fin de mois',
      delaiPaiement: bon.delaiPaiement || 30,
    });

    if (bon.dateLivraisonPrevue || bon.pointLivraison || bon.transporteur) {
      this.bonForm.patchValue({
        dateLivraisonPrevue: bon.dateLivraisonPrevue ? 
          new Date(bon.dateLivraisonPrevue).toISOString().split('T')[0] : '',
        pointLivraison: bon.pointLivraison || '',
        transporteur: bon.transporteur || ''
      });
    }

    this.onTypeBonChange();
  }

  // ==================== VALIDATION ====================
  private validateForm(): void {
    this.erreurs = [];
    
    // Validation du type
    if (!this.bonForm.get('type')?.valid) {
      this.erreurs.push('Le type de bon est requis');
    }
    
    // Validation spécifique pour les retours
    if (this.typeBon === 'retour') {
      if (!this.bonForm.get('numeroBonOrigine')?.value) {
        this.erreurs.push('Le numéro du bon d\'origine est requis');
      }
      if (!this.bonForm.get('motifsRetour')?.value || 
          this.bonForm.get('motifsRetour')?.value.length < 10) {
        this.erreurs.push('Les motifs du retour doivent contenir au moins 10 caractères');
      }
    }
    
    // Validation des montants
    const avance = this.bonForm.get('avance')?.value || 0;
    if (avance > this.totalTTC && !this.isRetourOuAvoir) {
      this.erreurs.push(`L'avance (${avance} F CFA) ne peut pas dépasser le total TTC (${this.totalTTC} F CFA)`);
    }
    
    this.isFormValid = this.erreurs.length === 0;
  }

  // ==================== GESTION DES TYPES DE BON ====================
  onTypeBonChange(): void {
    // Mise à jour des validateurs
    if (this.typeBon === 'retour') {
      this.bonForm.get('numeroBonOrigine')?.setValidators([Validators.required]);
      this.bonForm.get('motifsRetour')?.setValidators([Validators.required, Validators.minLength(10)]);
      this.bonForm.patchValue({ avance: 0 });
      // Afficher le panier pour les retours
      this.showPanierSection = true;
    } else if (this.typeBon === 'avoir') {
      // Pour l'avoir, on masque le panier
      this.showPanierSection = false;
      this.isPanierValid = false;
      this.bonForm.patchValue({ avance: 0 });
      // Ajouter un validateur pour le montant de l'avoir
      this.bonForm.get('montantAvoir')?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      this.bonForm.get('numeroBonOrigine')?.clearValidators();
      this.bonForm.get('motifsRetour')?.clearValidators();
      this.bonForm.get('montantAvoir')?.clearValidators();
    }
    
    this.bonForm.get('numeroBonOrigine')?.updateValueAndValidity();
    this.bonForm.get('motifsRetour')?.updateValueAndValidity();
    this.bonForm.get('montantAvoir')?.updateValueAndValidity();
    
    this.updateFileUploadVisibility();
    this.updateLogistiqueFieldsVisibility();
    this.validateForm();
  }
  // ==================== VISIBILITÉ DES SECTIONS ====================
  private updateFileUploadVisibility(): void {
    this.showFileUpload = this.showFileField && !this.isRetourOuAvoir;
  }

  private updateLogistiqueFieldsVisibility(): void {
    this.showLogistiqueFields = this.isCommande || 
                                 (this.typeBon === 'livraison' && this.typeEntite === 'fournisseur');
  }

  // ==================== GESTION DU PANIER ====================
  onPanierEnregistre(panier: Panier): void {
    console.log('📦 Panier reçu:', panier.statut);
    this.panierData = panier;
    
    if (panier.statut === 'validé') {
      this.isPanierValid = true;
      this.showResumeSection = true;
    } else if (panier.statut === 'en_cours') {
      this.isPanierValid = false;
      this.showResumeSection = false;
    }
    
    this.validateForm();
    this.cdr.detectChanges();
  }

  onPanierAnnule(): void {
    this.panierData = null;
    this.isPanierValid = false;
    this.showResumeSection = false;
    this.onAnnulerBon.emit();
  }

  onTotalPanierChange(_total: number): void {
    this.validateForm();
  }

  // ==================== ACTIONS ====================
  togglePanier(): void {
    this.showPanierSection = !this.showPanierSection;
  }

  // ==================== PRÉPARATION DES DONNÉES ====================
  prepareBonData(): { bon: Bon, fichier: File | null } {
  const formValue = this.bonForm.value;
  
  const baseData = {
    numero: this.generateNumero(),
    type: formValue.type,
    description: formValue.description,
    referenceExterne: formValue.referenceExterne,
    typeEntite: this.typeEntite,
    statutBon: 'validé' as const,
    dateBon: new Date(),
    panier: this.panierData || undefined,
    conditionsPaiement: formValue.conditionsPaiement,
    delaiPaiement: formValue.delaiPaiement
  };

  // Pour les avoirs
  if (this.typeBon === 'avoir') {
    const bonAvoir = new Bon({
      ...baseData,
      montantAvoir: formValue.montantAvoir || 0,
      montantTotal: 0,
      remise: 0,
      avance: 0,
      netAPayer: 0,
      resteAPayer: 0,
    });

    return { bon: bonAvoir, fichier: this.fichierSelectionne };
  }

  // Pour les retours
  if (this.typeBon === 'retour') {
    const bonRetour = new Bon({
      ...baseData,
      numeroBonOrigine: formValue.numeroBonOrigine,
      motifsRetour: formValue.motifsRetour,
      montantAvoir: 0,
      montantTotal: this.totalTTC,
      remise: this.montantRemise,
      avance: 0,
      netAPayer: this.totalTTC,
      resteAPayer: this.totalTTC,
    });

    if (formValue.dateLivraisonPrevue) {
      bonRetour.dateLivraisonPrevue = new Date(formValue.dateLivraisonPrevue);
    }
    bonRetour.pointLivraison = formValue.pointLivraison;
    bonRetour.transporteur = formValue.transporteur;

    return { bon: bonRetour, fichier: this.fichierSelectionne };
  }

  // Pour les autres types (commande, livraison, vente)
  const bonStandard = new Bon({
    ...baseData,
    montantTotal: this.totalTTC,
    montantAvoir: 0,
    remise: this.montantRemise,
    avance: formValue.avance || 0,
    methodePaiement: formValue.methodePaiement,
    netAPayer: this.totalTTC,
    resteAPayer: this.resteAPayer,
  });

  if (formValue.dateLivraisonPrevue) {
    bonStandard.dateLivraisonPrevue = new Date(formValue.dateLivraisonPrevue);
  }
  bonStandard.pointLivraison = formValue.pointLivraison;
  bonStandard.transporteur = formValue.transporteur;

  if (this.typeEntite === 'client' && this.entiteId) {
    bonStandard.clientId = this.entiteId;
  } else if (this.typeEntite === 'fournisseur' && this.entiteId) {
    bonStandard.fournisseurId = this.entiteId;
  }

  return { bon: bonStandard, fichier: this.fichierSelectionne };
}

  // ==================== SOUMISSION ====================
  submitBon(): void {
    if (this.isFormSubmitting) return;
    
    if (!this.canEnregistrer) {
      this.toastr.warning('Veuillez corriger les erreurs avant d\'enregistrer');
      return;
    }
    
    this.isFormSubmitting = true;
    
    const { bon, fichier } = this.prepareBonData();
    
    if (this.bonBrouillon?.id) {
      bon.id = this.bonBrouillon.id;
    }
    
    console.log('Données bon envoyées au parents',bon);
    
    this.onEnregistrerBon.emit({ bon, fichier });
    
    setTimeout(() => {
      this.isFormSubmitting = false;
    }, 1000);
  }

  // ==================== ANNULATION ====================
  annulerBon(): void {
    if (!confirm('Annuler l\'enregistrement du bon ?')) return;
    
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

  // ==================== RÉINITIALISATION ====================
  reinitialiserFormulaire(): void {
    this.bonForm.reset({
      type: 'commande',
      description: '',
      referenceExterne: '',
      numeroBonOrigine: '',
      motifsRetour: '',
      montantAvoir: 0,
      avance: 0,
      methodePaiement: '',
      conditionsPaiement: '30 jours fin de mois',
      delaiPaiement: 30,
      dateLivraisonPrevue: '',
      pointLivraison: '',
      transporteur: ''
    });

    this.fichierSelectionne = null;
    this.erreurs = [];
    this.panierData = null;
    this.isPanierValid = false;
    this.showPanierSection = false;
    this.showResumeSection = false;
    this.isFormValid = false;
    
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    
    this.onReinitialiserPanier.emit();
    this.bonBrouillon = null;
  }

  // ==================== GESTION DES FICHIERS ====================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (!file) return;
    
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

  // ==================== UTILITAIRES ====================
  generateNumero(): string {
    return `BON-${uuidv4()}`;
  }

  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }
}
