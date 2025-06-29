import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AnalyseEcart, MouvementsStock, Reconciliation } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
@Component({
  selector: 'app-entrees-sorties',
  standalone:true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './entrees-sorties.component.html',
  styleUrl: './entrees-sorties.component.css'
})
export class EntreesSortiesComponent implements OnInit {

  pageSize: number = 5;

  // Formulaire unique pour les mouvements de stock
  mouvementForm: FormGroup;
  mouvements: MouvementsStock[] = [];
  filteredMouvements: MouvementsStock[] = [];
  filteredEcarts: AnalyseEcart[] = [];
  searchTextMouvement: string = '';
  searchTextEcart:string = '';
  currentPageMouvement: number = 1;
  currentPageEcarts: number = 1;
  currentPageReconcialiation: number = 1;


  // Ajoutez une variable pour gérer l'état du formulaire
  isEditing = false;
  currentMouvement: MouvementsStock | null = null; // Pour stocker le mouvement à éditer


  reconciliations: Reconciliation[] = [];
  searchTextReconciliation: string = '';
  filteredReconciliations: any[] = [];
  analysesEcarts: AnalyseEcart[] = [];
  reconciliationForm!: FormGroup;
  isEditingReconciliation = false;
  selectedReconciliation: Reconciliation | null = null;
  historiqueSelectionne: { date: Date; ecart: number; note?: string }[] = [];

  detailsSelectionnes: { date: Date; ecart: number; corrige?: boolean }[] = [];
  produits: Produits[] = [];




  constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder) {
    // Initialisation des formulaires réactifs
    this.mouvementForm = new FormGroup({
      produitId: new FormControl('', Validators.required),
      quantite: new FormControl(0, [Validators.required, Validators.min(1)]),
      uniteStock: new FormControl('', Validators.required),
      typeMouvement: new FormControl('', Validators.required), // 'entree' ou 'sortie'
      description: new FormControl('', Validators.required),
    });

    this.reconciliationForm = this.fb.group({
      produitId: ['', Validators.required],
      stockTheorique: ['', Validators.required],
      stockPhysique: ['', Validators.required],
      note: [''], // ✅ Champ optionnel
    });

  }
  ngOnInit() {

    this.produits = [
    /*   new Produits({ id: 101, categorieId: "Boissons", designation: "Lait Caillé 1L", fournisseurId: 10, unite: "Litre", prixAchatUnitaire: 100, prixVenteUnitaire: 150, codeBarre: "123456789101", description: "Lait caillé frais de qualité supérieure" }),

      new Produits({ id: 102, famille: "Alimentation", designation: "Couscous de mil 500g", fournisseurId: 11, unite: "Paquet", prixAchatUnitaire: 150, prixVenteUnitaire: 200, codeBarre: "223344556677", description: "Couscous traditionnel 100% mil" }),

      new Produits({ id: 103, famille: "Biscuits", designation: "Biscuits Chocolatés", fournisseurId: 12, unite: "Carton", prixAchatUnitaire: 80, prixVenteUnitaire: 120, codeBarre: "334455667788", description: "Biscuits croquants au chocolat" }),

      new Produits({ id: 104, famille: "Électronique", designation: "Clavier Sans Fil", fournisseurId: 20, unite: "Pièce", prixAchatUnitaire: 700, prixVenteUnitaire: 900, codeBarre: "445566778899", description: "Clavier ergonomique sans fil avec connexion Bluetooth" }),

      new Produits({ id: 105, famille: "Boissons", designation: "Jus de Bissap 1L", fournisseurId: 13, unite: "Litre", prixAchatUnitaire: 90, prixVenteUnitaire: 130, codeBarre: "556677889900", description: "Jus naturel à base de fleurs d'hibiscus" }),

      new Produits({ id: 201, famille: "Électronique", designation: "Casque Bluetooth", fournisseurId: 21, unite: "Pièce", prixAchatUnitaire: 200, prixVenteUnitaire: 300, codeBarre: "667788990011", description: "Casque sans fil avec réduction de bruit" }),

      new Produits({ id: 202, famille: "Électroménager", designation: "Mixeur Multifonctions", fournisseurId: 22, unite: "Pièce", prixAchatUnitaire: 500, prixVenteUnitaire: 700, codeBarre: "778899001122", description: "Mixeur performant avec accessoires complets" }),

      new Produits({ id: 203, famille: "Alimentation", designation: "Riz Basmati 5kg", fournisseurId: 14, unite: "Sachet", prixAchatUnitaire: 350, prixVenteUnitaire: 450, codeBarre: "889900112233", description: "Riz parfumé de haute qualité" }),

      new Produits({ id: 204, famille: "Vêtements", designation: "T-shirt Coton XL", fournisseurId: 23, unite: "Pièce", prixAchatUnitaire: 250, prixVenteUnitaire: 400, codeBarre: "990011223344", description: "T-shirt 100% coton taille XL" }),

      new Produits({ id: 205, famille: "Accessoires", designation: "Montre Connectée", fournisseurId: 24, unite: "Pièce", prixAchatUnitaire: 450, prixVenteUnitaire: 650, codeBarre: "001122334455", description: "Montre connectée avec suivi de santé et notifications" }), */
    ];


    this.mouvements = [
      new MouvementsStock({ id: 1, ref: "REF123", produitId: 101, quantite: 50, prixUnitaire: 100, prixTotal: 5000, acteurId: 200, typeMouvement: "Entree",  description: "Commande d'approvisionnement", dateMouvement: new Date('2025-01-20')  }),
      new MouvementsStock({ id: 2, ref: "REF201", produitId: 201, quantite: 30, prixUnitaire: 200, prixTotal: 6000, acteurId: 250, typeMouvement: "Sortie", description: "Vente de produits électroniques", dateMouvement: new Date('2025-01-20') }),
      new MouvementsStock({ id: 3, ref: "REF305", produitId: 102, quantite: 20, prixUnitaire: 150, prixTotal: 3000, acteurId: 300, typeMouvement: "Entree",  description: "Réception de marchandise", dateMouvement: new Date('2025-01-22') }),
      new MouvementsStock({ id: 4, ref: "REF409", produitId: 202, quantite: 15, prixUnitaire: 500, prixTotal: 7500, acteurId: 350, typeMouvement: "Sortie", description: "Livraison à un client", dateMouvement: new Date('2025-01-23') }),
      new MouvementsStock({ id: 5, ref: "REF517", produitId: 103, quantite: 60, prixUnitaire: 80, prixTotal: 4800, acteurId: 400, typeMouvement: "Entree", description: "Stock réapprovisionné", dateMouvement: new Date('2025-01-25')}),
      new MouvementsStock({ id: 6, ref: "REF628", produitId: 203, quantite: 25, prixUnitaire: 350, prixTotal: 8750, acteurId: 450, typeMouvement: "Sortie",  description: "Vente en gros", dateMouvement: new Date('2025-01-26')}),
      new MouvementsStock({ id: 7, ref: "REF731", produitId: 104, quantite: 10, prixUnitaire: 700, prixTotal: 7000, acteurId: 500, typeMouvement: "Entree",  description: "Achat de matériel informatique", dateMouvement: new Date('2025-01-28')}),
      new MouvementsStock({ id: 8, ref: "REF846", produitId: 204, quantite: 18, prixUnitaire: 250, prixTotal: 4500, acteurId: 550, typeMouvement: "Sortie",  description: "Expédition vers un magasin", dateMouvement: new Date('2025-01-29') }),
      new MouvementsStock({ id: 9, ref: "REF952", produitId: 105, quantite: 40, prixUnitaire: 90, prixTotal: 3600, acteurId: 600, typeMouvement: "Entree",  description: "Approvisionnement de stock", dateMouvement: new Date('2025-01-30')}),
      new MouvementsStock({ id: 10, ref: "REF1057", produitId: 205, quantite: 22, prixUnitaire: 450, prixTotal: 9900, acteurId: 650, typeMouvement: "Sortie",  description: "Vente directe à un client", dateMouvement: new Date('2025-02-01')}),
    ];

    this.reconciliations = [
      new Reconciliation({
        id: 1, produitId: 101, stockTheorique: 50, stockPhysique: 48, ecart: -2,
        dateReconciliation: new Date('2025-02-10'), responsable: "Alioune Ndiaye",
        note: "Erreur d'inventaire",
        historiqueEcart: [
          { date: new Date('2025-02-08'), ecart: -1, note: "Première vérification" },
          { date: new Date('2025-02-09'), ecart: -2, note: "Correction appliquée" }
        ]
      }),
      new Reconciliation({
        id: 2, produitId: 201, stockTheorique: 30, stockPhysique: 32, ecart: 2,
        dateReconciliation: new Date('2025-02-12'), responsable: "Fatou Diop",
        note: "Erreur de comptage",
        historiqueEcart: [
          { date: new Date('2025-02-11'), ecart: 1, note: "Vérification initiale" },
          { date: new Date('2025-02-12'), ecart: 2, note: "Correction appliquée" }
        ]
      }),
      new Reconciliation({
        id: 3, produitId: 102, stockTheorique: 20, stockPhysique: 18, ecart: -2,
        dateReconciliation: new Date('2025-02-15'), responsable: "Moussa Sow",
        note: "Produit détérioré",
        historiqueEcart: [
          { date: new Date('2025-02-14'), ecart: -1, note: "Écart détecté" },
          { date: new Date('2025-02-15'), ecart: -2, note: "Vérification finale" }
        ]
      }),
      new Reconciliation({
        id: 4, produitId: 202, stockTheorique: 15, stockPhysique: 14, ecart: -1,
        dateReconciliation: new Date('2025-02-18'), responsable: "Awa Ba",
        note: "Manque de stock",
        historiqueEcart: [
          { date: new Date('2025-02-17'), ecart: -1, note: "Réduction confirmée" }
        ]
      }),
      new Reconciliation({
        id: 5, produitId: 103, stockTheorique: 60, stockPhysique: 60, ecart: 0,
        dateReconciliation: new Date('2025-02-20'), responsable: "Cheikh Faye",
        note: "Stock exact",
        historiqueEcart: []
      }),
      new Reconciliation({
        id: 6, produitId: 203, stockTheorique: 25, stockPhysique: 22, ecart: -3,
        dateReconciliation: new Date('2025-02-22'), responsable: "Mariama Ndiaye",
        note: "Erreur de saisie",
        historiqueEcart: [
          { date: new Date('2025-02-21'), ecart: -2, note: "Première vérification" },
          { date: new Date('2025-02-22'), ecart: -3, note: "Correction finale" }
        ]
      }),
      new Reconciliation({
        id: 7, produitId: 104, stockTheorique: 10, stockPhysique: 9, ecart: -1,
        dateReconciliation: new Date('2025-02-25'), responsable: "Boubacar Diallo",
        note: "Produit manquant",
        historiqueEcart: [
          { date: new Date('2025-02-24'), ecart: -1, note: "Inventaire vérifié" }
        ]
      }),
      new Reconciliation({
        id: 8, produitId: 204, stockTheorique: 18, stockPhysique: 19, ecart: 1,
        dateReconciliation: new Date('2025-02-28'), responsable: "Adama Sy",
        note: "Erreur positive",
        historiqueEcart: [
          { date: new Date('2025-02-27'), ecart: 1, note: "Ajout détecté" }
        ]
      }),
      new Reconciliation({
        id: 9, produitId: 105, stockTheorique: 40, stockPhysique: 37, ecart: -3,
        dateReconciliation: new Date('2025-03-01'), responsable: "Ousmane Fall",
        note: "Stock mal compté",
        historiqueEcart: [
          { date: new Date('2025-02-29'), ecart: -2, note: "Première vérification" },
          { date: new Date('2025-03-01'), ecart: -3, note: "Confirmation" }
        ]
      }),
      new Reconciliation({
        id: 10, produitId: 205, stockTheorique: 22, stockPhysique: 23, ecart: 1,
        dateReconciliation: new Date('2025-03-03'), responsable: "Aissatou Kane",
        note: "Correction après comptage",
        historiqueEcart: [
          { date: new Date('2025-03-02'), ecart: 1, note: "Ajout détecté" }
        ]
      })
    ];

    this.filteredReconciliations = [...this.reconciliations];

    this.filteredMouvements =[... this.mouvements];
    this.updateTable('mouvement');
    this.updateTable('reconciliation');
    /* console.log('Taille analyseEcart:',this.analysesEcarts.length);
    console.log('Taille filteredEcart:',this.filteredEcarts.length); */
    this.chargerAnalysesEcarts();
    this.updateTable('ecart');

  }

  voirHistorique(reconciliation: Reconciliation) {
    this.historiqueSelectionne = reconciliation.historiqueEcart || [];
    const historiqueModal = new (window as any).bootstrap.Modal(document.getElementById('historiqueModal')!);
    historiqueModal.show();
  }

  voirDetails(analyse: any) {
    this.detailsSelectionnes = analyse.ecartsDetail || []; // Charge les détails
    const detailsModal = new (window as any).bootstrap.Modal(document.getElementById('detailsModal')!);
    detailsModal.show();
  }

  // Filtrage des mouvements
updateTable(table:string) {
  if(table ==='mouvement'){
    this.filteredMouvements = this.mouvements.slice((this.currentPageMouvement - 1) * 10, this.currentPageMouvement * 10);
  }
  else if(table === 'reconciliation') {
    this.filteredReconciliations = this.reconciliations.slice((this.currentPageReconcialiation - 1) * 10, this.currentPageReconcialiation * 10);
  }
  else if(table === 'ecart') {
    this.filteredEcarts = this.analysesEcarts.slice((this.currentPageEcarts - 1) * 10, this.currentPageEcarts * 10);
  }
  else {
    console.log('Pas de choix correspondant à la valeur de table')
  }
}

// Gestion de la recherche
onSearchChange(): void {
  this.filteredMouvements = this.mouvements.filter(mvt =>
    mvt.ref.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
    this.getNomProduitById(mvt.produitId, this.produits).includes(this.searchTextMouvement.toLowerCase()) ||
    mvt.typeMouvement.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
    mvt.quantite?.toString().toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
    new Date (mvt.dateMouvement).toLocaleDateString().toLowerCase().includes(this.searchTextMouvement.toLowerCase())
  );
  this.currentPageMouvement =1;
}
onSearchChangeEcart(): void {
  this.filteredEcarts = this.analysesEcarts.filter(ecart =>
    this.getNomProduitById(ecart.produitId, this.produits).toLowerCase().includes(this.searchTextEcart.toLowerCase()) ||
    new Date(ecart.dernierEcart).toLocaleDateString().toLowerCase().includes(this.searchTextEcart.toLowerCase()) ||
    ecart.nombreReconciliations?.toString().toLowerCase().includes(this.searchTextEcart.toLowerCase())
  );
  this.currentPageEcarts =1;
}
onSearchReconciliation(): void {
  const searchText = this.searchTextReconciliation.toLowerCase();
  this.filteredReconciliations = this.reconciliations.filter(reconciliation =>
    this.getNomProduitById(reconciliation.produitId, this.produits).toLowerCase().includes(searchText.toLowerCase()) ||
    reconciliation.stockTheorique.toString().toLowerCase().includes(searchText.toLowerCase()) ||
    reconciliation.stockPhysique.toString().toLowerCase().includes(searchText.toLowerCase())
  );
  this.currentPageReconcialiation = 1;
}
get getPaginatedMouvements() {
  return this.paginate(this.filteredMouvements, this.currentPageMouvement, this.pageSize);
}

get getPaginatedReconciliations() {
  return this.paginate(this.filteredReconciliations, this.currentPageReconcialiation, this.pageSize);
}

get getPaginatedEcarts() {
  return this.paginate(this.filteredEcarts, this.currentPageEcarts, this.pageSize);
}


paginate(data: any[], currentPage: number, itemsPerPage: number) {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}

onPageChange(page: number, table: string) {
  if(table ==='mouvement'){
    this.currentPageMouvement = page;
  }
  else if(table === 'reconciliation') {
    this.currentPageReconcialiation = page;
  }
  else if(table === 'ecart') {
    this.currentPageEcarts = page;
  }
  else {
    console.log('Pas de choix correspondant à la valeur de table')
  }

}

getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.pageSize);
}

// Suppression d'un mouvement
supprimerMouvement(mouvement: MouvementsStock) {
  const index = this.mouvements.indexOf(mouvement);
  if (index > -1) {
    this.mouvements.splice(index, 1);
  }
  console.log("Mouvement supprimé", mouvement);
}

// Méthode pour charger les données d'un mouvement dans le formulaire
modifierMouvement(mouvement: MouvementsStock) {
  // Changer le mode édition et stocker le mouvement à éditer
  this.isEditing = true;
  this.currentMouvement = mouvement;

  // Remplir le formulaire avec les données du mouvement sélectionné
  this.mouvementForm.patchValue(mouvement)

  const modalElement = document.getElementById("mouvementModal");
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
}

onRowsPerPageChange(event: any) {
  this.pageSize = Number(event.target.value);

this.currentPageMouvement =1;
this.currentPageReconcialiation = 1;
this.currentPageEcarts = 1;

  this.cdr.detectChanges(); // Forcer la mise à jour de la vue
}

// Méthode pour enregistrer ou mettre à jour un mouvement
enregistrerMouvement() {
  if (this.mouvementForm.invalid) {
    return; // Ne pas soumettre si le formulaire est invalide
  }

  const mouvementData = this.mouvementForm.value;

  if (this.isEditing && this.currentMouvement) {
    // Si nous sommes en mode édition, mettez à jour le mouvement
    const updatedMouvement = {
      ...this.currentMouvement,
      ...mouvementData, // Mettre à jour les champs du mouvement avec les nouvelles valeurs
      id: this.currentMouvement.id // Conserver l'id
    };
    // Mettez à jour votre tableau ou effectuez la logique de mise à jour ici
    this.mouvements = this.mouvements.map(mouvement =>
      mouvement.id === updatedMouvement.id ? updatedMouvement : mouvement
    );
  } else {
    // Si nous ne sommes pas en mode édition, ajoutez un nouveau mouvement
    const newMouvement = new MouvementsStock({
      ...mouvementData,
      id: this.mouvements.length + 1, // ID généré (vous pouvez ajuster selon votre logique)
      ref: 'REF' + (this.mouvements.length + 1), // Exemple de référence
      dateMouvement: new Date(), // Date actuelle du mouvement
      dateCreation: new Date(),
      heureCreation: new Date()
    });
    this.mouvements.push(newMouvement);
  }

  // Réinitialiser le formulaire et revenir au mode ajout
  this.mouvementForm.reset();
  this.isEditing = false;
  this.currentMouvement = null;
}

getNomProduitById(produitId: number, produits: Produits[]): string {
  const produit = produits.find(p => p.id === produitId);
  return produit ? produit.designation : "Produit introuvable";
}

getUniteProduitById(produitId: number, produits: Produits[]): string {
  const produit = produits.find(p => p.id === produitId);
  return produit ? produit.unite : "Produit introuvable";
}

ajouterMouvement(data: any): void {
  // Logique pour ajouter un mouvement
  console.log('Ajout du mouvement', data);
}

mettreAJourMouvement(data: any): void {
  // Logique pour mettre à jour un mouvement
  console.log('Mise à jour du mouvement', data);
  // Vous pouvez ici appeler un service pour effectuer la mise à jour
}

enregistrerReconciliation() {
  if (this.reconciliationForm.invalid) return;

  const { produitId, stockTheorique, stockPhysique } = this.reconciliationForm.value;

  if (this.isEditingReconciliation && this.selectedReconciliation) {
    this.selectedReconciliation.produitId = produitId;
    this.selectedReconciliation.stockTheorique = stockTheorique;
    this.selectedReconciliation.stockPhysique = stockPhysique;
    this.selectedReconciliation.ecart = stockPhysique - stockTheorique;
  }
  else {
    // ✅ Création correcte d'une instance de `Reconciliation`
    const nouvelleReconciliation = new Reconciliation({
      id: this.reconciliations.length + 1,
      produitId,
      stockTheorique,
      stockPhysique,
      dateReconciliation: new Date(),
    });

    this.reconciliations.push(nouvelleReconciliation);
  }

  this.reconciliationForm.reset();
  this.isEditingReconciliation = false;
  this.chargerAnalysesEcarts();
}

modifierReconciliation(reconciliation: Reconciliation) {
  this.isEditingReconciliation = true;
  this.selectedReconciliation = reconciliation;
  this.reconciliationForm.patchValue(reconciliation);

  const modalElement = document.getElementById("reconciliationModal");
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
}

supprimerReconciliation(reconciliation: Reconciliation) {
  this.reconciliations = this.reconciliations.filter(r => r.id !== reconciliation.id);
  this.chargerAnalysesEcarts();
}

chargerAnalysesEcarts() {
  const analysesMap = new Map<number, AnalyseEcart>();

  this.reconciliations.forEach(reconciliation => {
    let existing = analysesMap.get(reconciliation.produitId);

    if (existing) {
      existing.ecartTotal += reconciliation.ecart;
      existing.nombreReconciliations = (existing.nombreReconciliations ?? 0) + 1;
      existing.ecartsDetail?.push({
        date: reconciliation.dateReconciliation,
        ecart: reconciliation.ecart,
        corrige: false // Ajoute un statut par défaut (ajuster si nécessaire)
      });
      existing.dernierEcart = reconciliation.dateReconciliation;
    } else {
      // ✅ Créer une instance de `AnalyseEcart`
      existing = new AnalyseEcart({
        produitId: reconciliation.produitId,
        ecartTotal: reconciliation.ecart,
        dernierEcart: reconciliation.dateReconciliation,
        nombreReconciliations: 1,
        ecartsDetail: [{
          date: reconciliation.dateReconciliation,
          ecart: reconciliation.ecart,
          corrige: false
        }]
      });

      analysesMap.set(reconciliation.produitId, existing);
    }
  });

  this.analysesEcarts = Array.from(analysesMap.values());
}


}
