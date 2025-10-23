import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Produits } from '../../modeles/produit.modele';
import { Bon, BonAvecFichier } from '../../modeles/bon.model';
import { Panier } from '../../modeles/panier.model';
import { PanierComponent } from '../panier/panier.component';
import { BonBrouillonService } from '../../services/bon-brouillon.service';
import { BonsService } from '../../services/bons.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-bon',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule,  FormsModule, PanierComponent],
  templateUrl: './bon.component.html',
  styleUrl: './bon.component.css'
})
export class BonComponent implements OnInit, OnChanges{
  
 @Input() produitsDisponibles: Produits[] = [];
  @Input() showBonForm = false;
  @Input() typeEntite: 'client' | 'fournisseur' = 'fournisseur';
  @Input() entiteId?: number;
  @Input() entiteNom?: string;
  @Input() showFileField = true;
   // Ajouter un Input pour forcer la réinitialisation
  @Input() resetForm = false;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEnregistrerBon = new EventEmitter<BonAvecFichier>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<void>();
  // Ajouter un Output pour réinitialiser le panier
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onErreurEnregistrement = new EventEmitter<string>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onReinitialiserPanier = new EventEmitter<void>();

  
  bonForm!: FormGroup;
  filteredProduits: Produits[] = [];
  searchInput = '';
  currentDate: string = new Date().toLocaleDateString();
  currentTime: string = new Date().toLocaleTimeString();
  generatedNumero: string = this.generateNumero();
  typeBon = '';
  panierDisabled = false;
  totalPanier = 0; // variable pour le total du panier pour le comparer au montant du bon
  showBonButtons = false; // Pour afficher les boutons du bon après validation du panier

  maxFileSize = 10 * 1024 * 1024; // 10MB

  erreurs: string[] = []; // Pour stocker les messages d'erreur
  modeMontant: 'saisi' | 'panier' = 'panier'; // valeur par défaut

  // Variables pour le panier intégré
  showPanier = true;
  panierData: Panier | null = null;

  fichierSelectionne: File | null = null;

  bonBrouillon: Bon | null = null;

  
  private fb = inject(FormBuilder);
  private bonBrouillonService = inject(BonBrouillonService);
  private bonService = inject(BonsService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit() {
    this.updateTime();
    this.bonForm = this.createBonForm();

    // S'abonner aux brouillons existants
    this.bonBrouillonService.bonBrouillon$.subscribe(bon => {
      this.bonBrouillon = bon;
      if (bon) {
        this.chargerBonBrouillon(bon);
      }
    });

    // Écouter les changements pour valider en temps réel
    this.bonForm.valueChanges.subscribe(() => {
      this.validerMontants();
    });
  }

   private chargerBonBrouillon(bon: Bon): void {
    this.generatedNumero = bon.numero;
    
    this.bonForm.patchValue({
      numero: bon.numero,
      type: bon.type,
      description: bon.description,
      remise: bon.remise || 0,
      avance: bon.avance || 0
    });

    // Charger le type de bon pour déclencher les bons comportements
    this.onTypeBonChange();
  }

  private sauvegarderBrouillonAuto(): void {
    if (this.bonForm.valid && this.typeBon) {
      const bonData = this.prepareBonData().bon;
      
      // Si c'est un nouveau brouillon, créer l'ID temporaire
      /* if (!this.bonBrouillon) {
        bonData.id = -Date.now(); // ID temporaire pour le frontend
      } else {
        bonData.id = this.bonBrouillon.id;
      } */

      bonData.statutBon = 'brouillon';
      this.bonBrouillonService.setBonBrouillon(bonData);
    }
  }


  // Surveiller les changements de resetForm
  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetForm'] && changes['resetForm'].currentValue === true) {
      console.log('ResetForm déclenché - Réinitialisation du bon');
      this.reinitialiserFormulaire();
    }
  }
  
  onTotalPanierChange(total: number): void {
  this.totalPanier = total;
}
  createBonForm(): FormGroup {
    return this.fb.group({
      type: ['commande', Validators.required],
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
  
 /*  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      
      this.fichierSelectionne = file;
    }
  } */
 // Méthode pour la sélection du fichier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (file) {
      // Validation de la taille
      if (file.size > this.maxFileSize) {
        alert(`Le fichier ${file.name} dépasse la taille maximale de 10MB`);
        this.fichierSelectionne = null;
        event.target.value = '';
        return;
      }

      // Validation du type
      if (!this.isFileTypeValid(file)) {
        alert(`Le format ${file.type} n'est pas accepté`);
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
    // Réinitialiser l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFileIcon(file: File): string {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('image')) return '🖼️';
    if (file.type.includes('word')) return '📝';
    return '📎';
  }
    
  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;

    if (this.typeBon === 'commande' || this.typeBon === 'livraison') {
      this.showFileField = true;
      this.modeMontant = 'panier';
    } 
    else if (this.typeBon === 'retour') {
      this.showFileField = false;
      this.modeMontant = 'saisi';
    }
    else {
      this.showFileField = false;
      this.modeMontant = 'panier';
    }
    // Force la détection de changement si besoin :
    this.cdr.detectChanges?.();
  }
  
  updateTime(): void {
    setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString();
    }, 1000);
  }
    reinitialiserEtMasquer(): void {
    this.reinitialiserFormulaire();
    this.showBonButtons = false;
  }
  submitBon(): void {
    /* if (this.bonForm.valid) {
      const bonData: Bon = this.prepareBonData();
      console.log('Bon à enregistrer :', bonData);
      // ⚡️ Associer le panierData si présent
      if (this.panierData) {
        bonData.panier = this.panierData;
      }
      this.onEnregistrerBon.emit(bonData);
    } */
   if (this.bonForm.valid) {
      //const bonData: Bon = this.prepareBonData();

      if (!this.panierData || this.panierData.articles.length === 0) {
        console.log('Veuillez ajouter des articles au panier avant d’enregistrer le bon');
        return;
      }

      const { bon, fichier } = this.prepareBonData();
      bon.statutBon = 'validé';
      if (this.bonBrouillon && this.bonBrouillon.id! > 0) {
        bon.id = this.bonBrouillon.id;
      }
      console.log('Bon à enregistrer :', bon);
      console.log('Fichier Bon :', fichier);
      this.onEnregistrerBon.emit({bon, fichier});
       // Réinitialiser immédiatement après l'émission
      //this.reinitialiserFormulaire();
      this.bonBrouillonService.clearBrouillons();
    } else {
      console.log('Veuillez remplir correctement le formulaire du bon');
      const errorMsg = 'Veuillez remplir correctement le formulaire du bon';
      console.log(errorMsg);
      this.onErreurEnregistrement.emit(errorMsg);
    }
  }

   // Méthode pour gérer l'événement du panier
  onPanierEnregistre(panier: Panier): void {
    this.panierData = panier;
    console.log("Dépuis bon : "+this.panierData );
    this.showBonButtons =true;
  }
  
  // Méthode pour gérer l'annulation du panier
  onPanierAnnule(): void {
    this.panierData = null;
  }

/* prepareBonData(): Bon {
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
} */

prepareBonData(): { bon: Bon, fichier: File | null } {
  const formValue = this.bonForm.value;
  const remise = Number(formValue.remise) || 0;
  const avance = Number(formValue.avance) || 0;
  const base = this.montantBase;

  if (this.modeMontant === 'panier' && this.panierData) {
     /* const panierInstance = new Panier({
      ...this.panierData,
      typeEntite: this.typeEntite || 'fournisseur',
      
    }); */
    
    // Correction : Créez des objets Produits valides avec toutes les propriétés requises
    /* const produits = this.panierData.articles
      .filter(article => article.produit) // Filtre les produits undefined
      .map(article => {
        // Créez un nouvel objet Produits avec des valeurs par défaut
        return new Produits({
          id: article.produit?.id || 0,
          categorieId: article.produit?.categorieId || 0,
          designation: article.produit?.designation || 'Produit sans nom',
          fournisseurId: article.produit?.fournisseurId,
          unite: article.produit?.unite || 'unité',
          prixAchatUnitaire: article.produit?.prixAchatUnitaire,
          prixVenteUnitaire: article.produit?.prixVenteUnitaire || 0,
          perissable: article.produit?.perissable || false,
          description: article.produit?.description,
          codeBarre: article.produit?.codeBarre,
          image: article.produit?.image,
          dateCreation: article.produit?.dateCreation || new Date(),
          agentId: article.produit?.agentId,
          dernierPrixAchat: article.produit?.dernierPrixAchat,
          statut: article.produit?.statut ?? true,
          // Note: quantite n'est pas une propriété normale de Produits,
          // mais nous l'ajoutons temporairement pour le panier
          //quantite: article.quantite
        });
      }); */

    return {
      bon:new Bon({
      numero: this.generatedNumero,
      type: formValue.type,
      description: formValue.description,
      montantTotal: base,
      remise,
      typeEntite:this.typeEntite,
      avance,
      netAPayer: base - remise,
      resteAPayer: base - remise - avance,
      dateBon: new Date(),
      statutBon: 'brouillon',
      panier: this.panierData ?? undefined /* {
        produits: produits,
        totalHT: this.panierData.totalHT,
        tva: this.panierData.tva,
        totalTTC: this.panierData.totalTTC
      } */
    }), 
    fichier: this.fichierSelectionne};
  }

  return {
    bon:new Bon({
    numero: this.generatedNumero,
    type: formValue.type,
    description: formValue.description,
    montantTotal: base - remise,
    typeEntite:'fournisseur',
    remise,
    avance,
    netAPayer: base - remise - avance,
    resteAPayer: base - remise - avance,
    dateBon: new Date(),
    statutBon: 'brouillon'
  }),
  fichier: this.fichierSelectionne}
}

// Dans BonComponent
/* get produitsPanier(): Produits[] {
  if (!this.panierData) return [];
  
  return this.panierData.articles.map(article => {
    return {
      ...article.produit,
      quantite: article.quantite,
      prixVenteUnitaire: article.prixVenteUnitaire
    };
  });
} */

// Correction de la méthode get produitsPanier()
/* get produitsPanier(): Produits[] {
  if (!this.panierData) return [];
  
  return this.panierData.articles
    .filter(article => article.produit)
    .map(article => {
      return new Produits({
        id: article.produit!.id || 0,
        categorieId: article.produit!.categorieId || 0,
        designation: article.produit!.designation || '',
        fournisseurId: article.produit!.fournisseurId,
        unite: article.produit!.unite || '',
        prixAchatUnitaire: article.produit!.prixAchatUnitaire,
        prixVenteUnitaire: article.produit!.prixVenteUnitaire || 0,
        perissable: article.produit!.perissable || false,
        description: article.produit!.description,
        codeBarre: article.produit!.codeBarre,
        image: article.produit!.image,
        dateCreation: article.produit!.dateCreation || new Date(),
        agentId: article.produit!.agentId,
        dernierPrixAchat: article.produit!.dernierPrixAchat,
        statut: article.produit!.statut ?? true
      });
    });
} */
  
  annulerBon(): void {
    //this.bonForm.reset();
    //this.panier.clear();
    //this.panierData = null;
    if (this.bonBrouillon) {
      // Supprimer le brouillon du backend
      this.bonService.supprimerBonComplet(this.bonBrouillon.id!)
        .subscribe({
          next: () => {
            this.toastr.success('Brouillon supprimé');
          },
          error: (err) => {
            console.error('Erreur suppression brouillon:', err);
          }
        });
    }
    this.reinitialiserFormulaire();
    this.bonBrouillonService.clearBrouillons();
    this.onAnnulerBon.emit();
  }

  reinitialiserFormulaire(): void {
    // Réinitialiser le formulaire bon
    this.bonForm.reset({
      remise: 0,
      avance: 0,
      type: '',
      description: '',
      refBonOrigine: '',
      motifAvoir: '',
      montantAvoir: 0,
      dateBonOrigine: ''
    });
    
    // Réinitialiser les variables
    this.fichierSelectionne = null;
    this.typeBon = '';
    this.generatedNumero = this.generateNumero();
    this.erreurs = [];
    this.modeMontant = 'panier';
     this.panierData = null;
    this.showBonButtons = false;
    
        
    // Réinitialiser l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // Émettre l'événement pour réinitialiser le panier
    this.onReinitialiserPanier.emit();
    this.bonBrouillon = null;
  }

}
