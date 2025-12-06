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
  modeMontant: 'saisi'|'mixte' | 'panier' = 'panier'; // valeur par défaut

  // Variables pour le panier intégré
  resetPanierTrigger = false;
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

// Méthode pour charger un brouillon de bon
  private chargerBonBrouillon(bon: Bon): void {
    this.generatedNumero = bon.numero;
    console.log('Chargement du brouillon de bon :', bon.type);
    //this.typeBon = bon.type.toLowerCase();
    this.bonForm.patchValue({
      numero: bon.numero,
      type: bon.type?.toLowerCase(),
      description: bon.description,
      remise: bon.remise || 0,
      avance: bon.avance || 0
    });

    // Charger le type de bon pour déclencher les bons comportements
    this.onTypeBonChange();
  }

  // Surveiller les changements de resetForm
  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetForm'] && changes['resetForm'].currentValue === true) {
      console.log('ResetForm déclenché - Réinitialisation du bon');
      this.reinitialiserFormulaire();
    }
  }
  
  // Méthode pour gérer le changement du total du panier
  onTotalPanierChange(total: number): void {
    this.totalPanier = total;
  }

// Méthode pour créer le formulaire du bon
createBonForm(): FormGroup {
    return this.fb.group({
      type: ['commande', Validators.required],
      description: [''],
      //montant: [[Validators.min(0)]],
      numeroBonOrigine: [''],
      motifsRetour: [''],
      montantAvoir: [[Validators.min(0)]],
      //dateBonOrigine: [''],
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
    //return this.bonForm.get('montantAvoir')?.value || 0;
    else if (this.modeMontant === 'saisi') {
      return this.bonForm.get('montantAvoir')?.value || 0;
    }
    else if (this.modeMontant === 'mixte') {
      // Pour les retours : priorité au panier, sinon au montant saisi
      if (this.panierData && this.panierData.articles.length > 0) {
        return this.totalPanier;
      } else {
        return this.bonForm.get('montantAvoir')?.value || 0;
      }
    }
    return 0;
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

  // Getter pour le montant net à payer
  get resteAPayer(): number {
    const total = this.totalBon;
    const avance = this.bonForm.get('avance')?.value || 0;
    return Math.max(0, total - avance);
  }

  // Getter pour le montant total du bon après remise
  get totalBon(): number {
    const formValue = this.bonForm.value;
    const remise = formValue.remise || 0;
    
    if (this.typeBon === 'retour') {
       return 0;
    }
    
    const base = this.montantBase;
    return Math.max(0, base - remise);
  }
  
  // Méthode pour générer un numéro unique de bon
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `BON-${timestamp}-${random}`;
  }
  
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

  // Méthode pour valider le type de fichier
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

  // Méthode pour supprimer le fichier sélectionné
  removeFile(): void {
    this.fichierSelectionne = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('fichierPaiement') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Obtenir l'icône du fichier en fonction de son type
  getFileIcon(file: File): string {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('image')) return '🖼️';
    if (file.type.includes('word')) return '📝';
    return '📎';
  }
    
  // Méthode appelée lors du changement de type de bon
  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;

     // Réinitialiser certains champs selon le type
      if (this.typeBon === 'retour') {
        this.bonForm.patchValue({
          remise: 0,
          avance: 0
        });
      }
    if (this.typeBon === 'commande' || this.typeBon === 'livraison') {
      this.showFileField = true;
      this.modeMontant = 'panier';
    } 
    else if (this.typeBon === 'retour') {
      this.showFileField = false;
      //this.modeMontant = 'saisi';
      this.modeMontant = 'mixte'; // Nouveau mode
      

    }
    else {
      this.showFileField = false;
      this.modeMontant = 'panier';
    }
    // Force la détection de changement si besoin :
    this.cdr.detectChanges?.();
  }
  
  // Met à jour l'heure chaque seconde
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
      if (this.bonForm.valid) {
        // Pour tous les types sauf retour, on vérifie le panier
        if (this.typeBon !== 'retour') {
          if (!this.panierData || this.panierData.articles.length === 0) {
            console.log('Veuillez ajouter des articles au panier avant d’enregistrer le bon');
            this.toastr.warning('Veuillez ajouter des articles au panier', 'Panier vide');
            return;
          }
        }

        // Pour le type retour, vérifier qu'on a au moins un montant ou un panier
        else if (this.typeBon === 'retour') {
          const montantAvoir = this.bonForm.get('montantAvoir')?.value || this.montantBase || 0;
          const hasPanier = this.panierData && this.panierData.articles.length > 0;
          
          if (montantAvoir <= 0 && !hasPanier) {
            console.log('Pour un retour, veuillez saisir un montant ou ajouter des articles au panier');
            this.toastr.warning('Pour un retour, saisissez un montant ou ajoutez des articles', 'Données manquantes');
            return;
          }
        }

        const { bon, fichier } = this.prepareBonData();
        bon.statutBon = 'validé';
        
        if (this.bonBrouillon && this.bonBrouillon.id! > 0) {
          bon.id = this.bonBrouillon.id;
        }
        
        console.log('Bon à enregistrer :', bon);
        console.log('Fichier Bon :', fichier);
        this.onEnregistrerBon.emit({bon, fichier});
        //this.bonBrouillonService.clearBrouillons();
      } else {
        console.log('Veuillez remplir correctement le formulaire du bon');
        const errorMsg = 'Veuillez remplir correctement le formulaire du bon';
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
    this.onAnnulerBon.emit();
  }


prepareBonData(): { bon: Bon, fichier: File | null } {
  const formValue = this.bonForm.value;
  const remise = Number(formValue.remise) || 0;
  const avance = Number(formValue.avance) || 0;
  const base = this.montantBase;

  // Pour le type retour, on peut avoir soit un panier soit un montant direct
  if (this.typeBon === 'retour') {
    //const montantAvoir = base;
    
    return {
      bon: new Bon({
        numero: this.generatedNumero,
        type: formValue.type,
        description: formValue.description,
        montantTotal: 0, // Pour un retour, le montant total est 0
        montantAvoir: base,
        numeroBonOrigine: formValue.numeroBonOrigine,
        motifsRetour: formValue.motifsRetour,
        remise: 0, // Pas de remise sur les retours
        typeEntite: this.typeEntite,
        avance: 0, // Pas d'avance sur les retours
        netAPayer: 0, // Net à payer est 0 pour les retours
        resteAPayer: 0, // Reste à payer est 0 pour les retours
        dateBon: new Date(),
        statutBon: 'validé',
        panier: this.panierData || undefined // Inclure le panier si disponible
      }), 
      fichier: this.fichierSelectionne
    };
  }

  // Pour les autres types (commande, livraison)
  if (!this.panierData) {
    console.error('Panier manquant lors de la préparation des données');
    this.toastr.error('Le panier est vide', 'Erreur');
    throw new Error('Panier manquant');
  }

  const montantApresRemise = base - remise;
  
  return {
    bon: new Bon({
      numero: this.generatedNumero,
      type: formValue.type,
      description: formValue.description,
      montantTotal: base,
      montantAvoir: 0,
      numeroBonOrigine: '',
      motifsRetour: '',
      remise,
      typeEntite: this.typeEntite,
      avance,
      netAPayer: montantApresRemise,
      resteAPayer: Math.max(0, montantApresRemise - avance),
      dateBon: new Date(),
      statutBon: 'validé',
      panier: this.panierData
    }), 
    fichier: this.fichierSelectionne
  };
}

  // Méthode pour annuler le bon
  annulerBon(): void {
    const confirmAnnulation = confirm('Annuler l\'enregistrement du bon?');
    if (confirmAnnulation) {
      if (this.bonBrouillon) {
        // Supprimer le brouillon du backend
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
            }
          });
      }
    }
    else{
      console.log('Annulation de l\'action');
    }
  }

  // Méthode pour réinitialiser le formulaire
  reinitialiserFormulaire(): void {
    // Réinitialiser le formulaire bon
    this.bonForm.reset({
      remise: 0,
      avance: 0,
      type: 'commande',
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
    this.resetPanierTrigger = !this.resetPanierTrigger; 
    
        
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
