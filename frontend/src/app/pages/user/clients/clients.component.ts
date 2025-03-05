import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Client} from '../../../modeles/clients.model';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApplicationService } from '../../../services/application.service';
import { Bon } from '../../../modeles/bon.model';
import { Paiement } from '../../../modeles/paiement.model';
import { Operation } from '../../../modeles/operation.model';
import { Panier } from '../../../modeles/panier.model';
import { Produits } from '../../../modeles/produit.modele';


@Component({
  selector: 'app-clients',
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css'
})
export class ClientsComponent implements OnInit {

  bonForm!: FormGroup;
  //panier!: FormArray;
  currentDate: string =' ';
  currentTime: string = '';
  selectedBonIndex: number | null = null;
  generatedNumero = 'BON-' + Math.floor(Math.random() * 1000000); // Numéro généré
  totalBon = 0; // Calculé dynamiquement
  totalPanier = 0;
  filteredProduits: any[] = [];
  searchInput: string = '';
  // Ajoutez cette variable dans votre composant pour gérer l'état du bouton
  panierDisabled = false;

  // Assurez-vous d'avoir une liste de tous les bons
  bons: any[] = []; // Remplir avec les bons correspondants

  typeBon: string = '';
  selectedClientId?: number; // Client sélectionné



    clients: Client[] = []; // Liste des Clients
    filteredClients: Client[] = []; // Liste filtrée pour la recherche
    searchQuery: string = ''; // Chaîne de recherche
    showDetails: boolean = false; // Affichage des détails
    showBonDetailsSection: boolean = false; // Affichage des détails des bons
    showPaiementDetailsSection: boolean = false; // Affichage des détails des paiements
    showForm: boolean = false; // Affichage du formulaire d'ajout
    showModal: boolean = false; // Affichage du modal d'ajout/édition
    isEditMode: boolean = false; // Mode édition ou ajout
    isRowSelected: boolean = false; // Indique si une ligne est sélectionnée
    //selectedBon: Bon[] = []; // Détails du bon sélectionné
    clientForm: FormGroup; // Formulaire de client
    selectedClient: Client | null = null; // Client sélectionné pour modification
    showBonForm: boolean = false;  // Variable pour afficher ou masquer le formulaire de bon
     // Autres variables existantes...
    paiementForm: FormGroup;  // Formulaire pour ajouter un paiement
    showPaiementForm: boolean = false;  // Pour afficher ou masquer le formulaire de paiement
    actionType: string = 'ajouter';

    showProductsSection = false;  // Affichage de la section des produits à ajouter
    searchProduct: string = '';  // Champ de recherche pour les produits
    produitsAjoutes: any[] = [];  // Liste des produits ajoutés au bon
    filteredProducts: any[] = [];  // Liste des produits filtrés pour autocomplétion

    totalPages : number = 1;

    // Variables de pagination et de filtre
    currentPageBon: number = 1;
    //currentPageBonBis: number = 1;
    totalPagesBon: number = 2;
    searchBonQuery: string = '';
    filteredBons: Bon[] = [];
    //filteredBonsBis: Bon[] = [];
    allBons: Bon[] = []; // Tous les bons

    currentPagePaiement: number = 1;
    totalPagesPaiement: number = 2;
    searchPaiementQuery: string = '';
    startDate?: string;
    endDate?: string;
    filteredPaiements: Paiement[] = [];
    allPaiements: Paiement[] = []; // Tous les paiements
    filteredOperations: Operation[] = []; // Opérations filtrées

    currentPageClient: number = 1;
    totalPagesClient: number = 2;

    rowsPerPage: number = 5; // Nombre par défaut de lignes par page

    selectedBonIndexC: number | null = null;
    selectedBonIndexB: number | null = null;
    selectedBonIndexP: number | null = null;
    selectedBonIndexO: number | null = null;


     produits = [
      { id: 1, nom: 'Lait', quantite: 10,uniteStock:'Sachets', prixUnitaire: 1000 },
      { id: 2, nom: 'Biscuits', quantite: 20,uniteStock:'Sac', prixUnitaire: 500 },
      { id: 3, nom: 'Couscous', quantite: 15,uniteStock:'Carton', prixUnitaire: 2000 }
    ];

    constructor(private fb: FormBuilder, private paginationService: ApplicationService,private cdr: ChangeDetectorRef) {

      // Initialisation du formulaire réactif pour un client
      this.clientForm = this.fb.group({
        nomComplet: ['', Validators.required],
        email: ['', [Validators.email]],
        telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
        adresse: ['',Validators.required],
        solde: [0],
        estEmploye: ['oui', Validators.required],
        plafond: [0, Validators.required],
        statut: ['actif', Validators.required]
      });

      // Initialisation du formulaire réactif pour un bon
      this.bonForm = this.fb.group({
        numero: ['', Validators.required],
        date: ['', Validators.required],
        montant: [0, Validators.required],
        statut: ['Impayé', Validators.required],
        type: ['', Validators.required],
        remise: [],
        avance: [],
        typePaiement: ['', Validators.required],
        panier: this.fb.array([]),

         // Champs spécifiques aux avoirs
        refBonOrigine: [''],
        motifAvoir: [''],
        montantAvoir: [''],
        dateBonOrigine: [''],
        clientAvoir: [''],

        // Champs spécifiques aux livraisons
        adresseLivraison: [''],
        livreur: [''],
        telephoneLivreur: [''],
        dateLivraison: [''],
        instructionsLivraison: [''],
      });

      // Initialisation du formulaire réactif pour un paiement
      this.paiementForm = this.fb.group({
        description: ['', Validators.required],
        montant: ['', [Validators.required, Validators.min(0)]],
        date: ['', Validators.required],
        methodePaiement: ['Virement', Validators.required],
      });

    }

    ngOnInit(): void {
      // Chargement des données des clients (par exemple via un service)
      this.loadClients();
      //this.addArticle();
      // Calcul du total à chaque changement de la remise, de la quantité et du prix unitaire
      this.bonForm.valueChanges.subscribe(() => {
        this.updateTotal();
      });
      this.onTypeBonChange(); // Met à jour les champs au chargement

      // Date et heure actuelles
    const currentDateObj = new Date();
    this.currentDate = currentDateObj.toLocaleDateString();
    this.currentTime = currentDateObj.toLocaleTimeString();

    // Générer le numéro du bon à partir de la date et de l'heure courantes
    this.generatedNumero = this.generateBonNumber(currentDateObj);

    console.log("Produits disponibles :", this.produits); // Vérifier si les produits sont bien chargés
    }

    onRowSelect(client: Client): void {
      this.selectedClient = client;
      this.isRowSelected = true;  // Lorsque la ligne est sélectionnée, la colonne droite s'affiche
    }

    // Fonction pour fermer la partie des actions (colonne droite)
    closeActions(): void {
      this.selectedClient = null;
      this.isRowSelected = false;  // Fermer la colonne droite en réinitialisant la sélection
    }


    onAction(action: string): void {
      //console.log(`${action} Produits:`, this.selectedClient);
      /* if (action === 'ajouter') {
        this.actionType = 'ajouter';
        this.selectedClient = null;  // S'assurer qu'aucun produit n'est sélectionné
      } else {
        this.actionType = action;  // On garde l'action sélectionnée
      } */
        this.actionType = action;
      //console.log(`${this.actionType} Client:`, this.selectedClient);
      if (this.selectedClient) {
          console.log(`${action} client:`, this.selectedClient);
          if (this.actionType === "operation") {
            this.showBonDetails()
          }
          else if(this.actionType === "modifier"){
            this.openModal(this.selectedClient)
          }
          else if(this.actionType === "supprimer"){
            this.deleteClient(this.selectedClient);
          }
          else if(this.actionType === "statut"){
            this.toggleStatut(this.selectedClient);
          }
          else {
            console.log('Aucune action correspondant')
          }

      }
      else {
          this.selectedClient = null;
          this.actionType = 'ajouter';  // On s'assure que l'actionType est bien 'ajouter' pour "Nouveau produit"
          this.selectedClient = null;
          this.openModal();
      }
    }

    loadClients(): void {
      // Exemple de données statiques avec instanciation des objets Client
      const noms = [
        'Moussa Diop', 'Awa Ndiaye', 'Fatou Sow', 'Ibrahima Fall', 'Khadija Faye',
        'Cheikh Ba', 'Oumar Sy', 'Adama Diallo', 'Seynabou Kane', 'Mamadou Gueye'
      ];
      const operationTypes = ['COMMANDE', 'VERSEMENT', 'LIVRAISON','TICKET_CAISSE', 'RETOUR','AVOIR','FACTURE'] as const;
      const methodePaiement = ['ESPECES', 'MOBILE_MONEY' , 'CARTE_BANCAIRE' , 'VIREMENT' , 'CHEQUE'] as const;
      const produitsDisponibles = ['Lait', 'Sucre', 'Riz', 'Farine', 'Huile', 'Pain', 'Fromage', 'Tomates', 'Jus', 'Café'];
      const bonstuatut = ['brouillon', 'commandé', 'expédié', 'livré', 'validé', 'retourné', 'facturé', 'payé', 'annulé'] as const;
      // Génération des Clients
      for (let i = 1; i <= 10; i++) {
        const client = new Client({
          id: i,
          nomComplet: noms[i - 1],
          email: `client${i}@example.com`,
          telephone: `77654${i}210`,
          adresse: `Adresse ${i}`,
          dateCreation: new Date(),
          plafond: Math.floor(Math.random() * 50000),
          solde: Math.floor(Math.random() * 50000) - 20000, // Peut être négatif
          statut: Math.random() < 0.5, // 80% de chance d'être actif
          bons: [],
          paiements: [],
        });



          // Création du panier avec 3 à 4 produits
          const nombreProduits = Math.floor(Math.random() * 2) + 3;
          const panier: {
            produits: Produits[]; // 👈 Déclare le type explicitement ici !
            totalHT: number;
            tva: number;
            totalTTC: number;
          } = {
            produits: [], // ✅ Plus d'erreur
            totalHT: 0,
            tva: 0,
            totalTTC: 0,
          };

          for (let k = 0; k < nombreProduits; k++) {
            let prixUnitaire = Math.floor(Math.random() * 1000) + 500;
            let quantite = Math.floor(Math.random() * 5) + 1;


            const produit = {
              id: k + 1,
              designation: produitsDisponibles[Math.floor(Math.random() * produitsDisponibles.length)],
              quantite: quantite,
              prixVenteUnitaire: prixUnitaire,
              famille:'',
              fournisseur:'',
              magasin:'',
              unite: 'Unité',
            };

            panier.produits.push(produit);
            panier.totalHT += prixUnitaire * quantite;
          }

          panier.tva = panier.totalHT * 0.18;
          panier.totalTTC = panier.totalHT + panier.tva;


          for (let j = 1; j <= 5; j++) {
            const bon = new Bon({
              id: j,
              numero: `B${i}${j}`,
              dateBon: new Date(),
              description: `Bon de commande ${j} du client ${i}`,
              montantTotal: Math.floor(Math.random() * 20000) + 2000,
              remise:Math.floor(Math.random() * 500) + 500,
              netAPayer:Math.floor(Math.random() * 20000) + 2000 - Math.floor(Math.random() * 500) + 500,
              resteAPayer:Math.floor(Math.random() * 10000) + 1000,
              statutBon: bonstuatut[Math.floor(Math.random() * bonstuatut.length)],
              type: ['Livraison', 'Commande', 'Retour', 'Avoir'][Math.floor(Math.random() * 4)] as "Livraison" | "Commande" | "Retour" | "Avoir",
              numeroFacture: `FACT${i}${j}`,
              clientId: client.id,
              panier: panier
            });

            const paiement = new Paiement({
              id: j,
              numero: `V${i}${j}`,
              date: new Date(),
              description: `Paiement ${j} du client ${i}`,
              montant: Math.floor(Math.random() * 10000) + 500,
              methodePaiement: ['Espèce', 'Carte', 'Mobile Money', 'Virement'][Math.floor(Math.random() * 4)],
              clientId: client.id,
              bonId: bon.id
            });

            const operation = new Operation({
              id: j,
              clientId: client.id,
              bonId: bon.id,
              paiementId: paiement.id,
              type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
              montantPaye: paiement.montant,
              statut: bon.montantTotal - paiement.montant === 0 ? 'PAYE' : 'PARTIELLEMENT_PAYE',
              dateOperation: new Date(),
              moyenPaiement: methodePaiement[Math.floor(Math.random() * methodePaiement.length)],
            });

          client.bons.push(bon);
          client.paiements.push(paiement);
          // Ajouter l'opération dans le client
          client.operations.push(operation);
        }

        this.clients.push(client);
      }

      this.filteredClients = [...this.clients]; // Initialiser la liste filtrée
      this.updatefilteredClients();

      // Mise à jour des bons et paiements
      this.clients.forEach(client => {
        this.allBons.push(...client.bons);
        this.allPaiements.push(...client.paiements);
      });
      this.filteredBons = [...this.allBons];
      this.filteredPaiements = [...this.allPaiements];
      this.updateFilteredBons();
      this.updateFilteredPaiements();
    }

    // Méthode pour mettre à jour les clients affichés en fonction de la page courante
    updatefilteredClients(): void {
      this.filteredClients = this.clients.slice((this.currentPageClient - 1) * 10, this.currentPageClient * 10);
    }
    // Gestion de la recherche
    onSearchChange(): void {
      this.filteredClients = this.clients.filter(client =>
        client.nomComplet.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.adresse.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.telephone?.toString().toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.solde.toString().toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      this.currentPageClient =1;
    }

    // Ouvrir le modal d'ajout ou modification
    openModal(client?: any): void {
      console.log('Texte du bouton bis:', this.actionType);
      //this.actionType === 'ajouter'
      if (client) {
        console.log('Valeur actionType:', this.actionType)
        if (this.actionType === 'ajouter') {
          this.isEditMode = false;
          this.clientForm.reset();
          //console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
        }
        else {
          this.isEditMode = true;
          //this.selectedClient = client;
          this.clientForm.patchValue(client); // Remplir le formulaire avec les données du client

        }
      } else {
        this.isEditMode = false;
        this.actionType = 'ajouter'
        this.clientForm.reset(); // Réinitialiser le formulaire
      }
      this.showModal = true;
    }

    // Soumettre le formulaire dans le modal
    onModalSubmit(): void {
      if (this.clientForm.valid) {
        const clientData = this.clientForm.value;
        if (this.isEditMode && this.selectedClient) {
          // Mise à jour du client
          Object.assign(this.selectedClient, clientData);
        } else {
          // Ajout du nouveau client
          const newclient = new Client(clientData);
          this.clients.push(newclient);
        }
        this.filteredClients = [...this.clients]; // Mettre à jour la liste filtrée
        this.closeModal();
      }
    }

    // Fermer le modal
    closeModal(): void {
      this.showModal = false;
    }

    // Supprimer un client
    deleteClient(client: Client): void {
      /* const index = this.clients.indexOf(client);
      if (index > -1) {
        this.clients.splice(index, 1);
        this.filteredClients = [...this.clients]; // Mettre à jour la liste filtrée
      } */

        let confirmation = confirm("Supprimer le client ?");
      if(confirmation){
        //this.listeProduitsSelectionnes.splice(indexP,1);
        //this.prodSrv.removeProduit(prod);
        //this.showInfo(prod);
        //alert(this.listeProduitsSelectionnes.length)
      }
      else {
        console.log("Action annulée");
      }
    }

   // Afficher les détails du bon
  showBonDetails(): void {

    this.showDetails = true;
    this.showBonDetailsSection = true;
    //this.selectedClient = client;
    //this.filteredBonsBis = [...client.totalBons];
    //this.filteredPaiementsBis = [...client.totalTransactions];
    //this.currentPageBonBis =1;
    //this.currentPagePaiement =1;
    //console.log('client sélectionné :', client.nomComplet);
    //console.log('Total bons :', this.filteredBons.length, 'Total paiements :', this.filteredPaiements.length);
    if (!this.selectedClient) return;

    // Définir une période de départ par défaut (ex : début du mois en cours)
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
    this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui

    this.filtrerOperations();

   /*  if(typeDetails === 'bon') {
      //this.updateFilteredBons();
      //this.selectedBon = this.selectedClient.totalBons;
      this.showBonDetailsSection = true;  // Afficher les détails des bons
      this.showPaiementDetailsSection = false;  // Masquer les détails des paiements
      //this.updateFilteredBons();
      //console.log('Bon',this.filteredBons.length);
      //console.log('Paiement',this.filteredPaiements.length);
    }
    else if (typeDetails === 'paiement') {
      //this.updateFilteredPaiements();
      //this.selectedPaiement = this.selectedClient.totalTransactions;
      this.showPaiementDetailsSection = true;  // Afficher les détails des paiements
      this.showBonDetailsSection = false;  // Masquer les détails des bons
      //this.updateFilteredPaiements
    }
    else{
      console.log("Pas de détails à affichier")
    } */
  }


  // Fermer les détails (bons ou paiements)
  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    this.showPaiementDetailsSection = false;
    //this.filteredBons = [];
    //this.filteredPaiements = [];
     //this.filteredBonsBis = [];
    //this.filteredPaiementsBis = [];
  }

  // Fonction pour afficher ou masquer le formulaire
  toggleBonForm(): void {
    this.showBonForm = !this.showBonForm;
  }

  resetFormPaiement() {

    this.paiementForm.reset();
    }

  // Fonction pour afficher ou masquer le formulaire de paiement
  togglePaiementForm(): void {
    this.showPaiementForm = !this.showPaiementForm;
  }

  // Fonction pour soumettre le formulaire du paiement
  onPaiementFormSubmit(): void {
    if (this.paiementForm.valid) {
      // Traitement pour ajouter un paiement
      const newPaiement = this.paiementForm.value;
      console.log('Nouveau Paiement:', newPaiement);

      // Réinitialiser le formulaire après soumission
      this.paiementForm.reset();
      this.showPaiementForm = false;  // Masquer le formulaire
    }
  }

     // Soumettre le formulaire de la section de droite (ajout d'un client)
     onFormSubmit(): void {
      if (this.clientForm.valid) {
        const clientData = this.clientForm.value;
        const newclient = new Client(clientData);
        this.clients.push(newclient);
        this.filteredClients = [...this.clients]; // Mettre à jour la liste filtrée
        this.clientForm.reset(); // Réinitialiser le formulaire
      }
    }

    // Ouvrir le formulaire d'édition d'un client
    editclient(): void {
      //this.selectedClient = client;
      if(this.selectedClient) {
        this.clientForm.patchValue(this.selectedClient); // Remplir le formulaire avec les données du client
        this.showForm = true; // Afficher le formulaire d'édition
        this.openModal();
      }
      else {'Veuillez sélectionné un client'}
    }

   // Méthodes pour la pagination
   get getPaginatedClients() {
    return this.paginationService.paginate(this.filteredClients, this.currentPageClient, this.rowsPerPage);
  }

  get getPaginatedBons() {
      return this.paginationService.paginate(this.filteredBons, this.currentPageBon, this.rowsPerPage);
  }

  get getPaginatedPaiements() {
      return this.paginationService.paginate(this.filteredPaiements, this.currentPagePaiement, this.rowsPerPage);
  }


     // Gérer le changement de page
  onPageChange(page: number, instanceObj: string): void {
    if(instanceObj === 'Client'){
      this.currentPageClient = page;
    }
    else if (instanceObj === 'Bon') {
      this.currentPageBon = page;
    }

    else if (instanceObj === 'Paiement') {
      this.currentPagePaiement = page;
    }
    console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);

  }


    /* onTypeBonChange(): void {
      // Mettre à jour les champs visibles et désactiver les champs non visibles
      this.bonForm.get('dateCommande')?.updateValueAndValidity();
      this.bonForm.get('dateReceptionPrevu')?.updateValueAndValidity();
      this.bonForm.get('dateLivraison')?.updateValueAndValidity();
      this.bonForm.get('motifsRetour')?.updateValueAndValidity();
    } */

  // Filtrer les bon
  onSearchChangeBon() {
    //if (this.selectedClient) {
      this.filteredBons = this.allBons.filter(bon => bon.numero.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
      bon.type.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
      bon.montantTotal.toString().toLowerCase().includes(this.searchBonQuery.toLowerCase())//||
      //this.getFournisseurByOperation(bon).toLowerCase().includes(this.searchBonQuery)
     );
     this.currentPageBon =  1;
    //}
    //this.updateFilteredBons();

  }

  // Fonction de mise à jour pour filtrer les bons d'un client et appliquer la pagination
  updateFilteredBons(): void {

      this.filteredBons = this.allBons.slice((this.currentPageBon - 1) * 10, this.currentPageBon * 10);
  }

  // Fonction de mise à jour pour filtrer les paiements d'un client et appliquer la pagination
  updateFilteredPaiements(): void {
      this.filteredPaiements = this.allPaiements.slice((this.currentPagePaiement - 1) * 10, this.currentPagePaiement * 10);
  }
  // Filtrer les paiements
  onSearchChangePaiement() {
    //this.updateFilteredPaiements();
    //if (this.selectedClient) {
      this.filteredPaiements = this.allPaiements.filter(paiement => paiement.description.toLocaleUpperCase().includes(this.searchPaiementQuery.toLowerCase()) ||
      paiement.methodePaiement.toLowerCase().includes(this.searchPaiementQuery.toLowerCase()) ||
      paiement.montant.toString().toLowerCase().includes(this.searchPaiementQuery.toLowerCase()) ||
      new Date(paiement.date).toLocaleDateString().includes(this.searchPaiementQuery.toLowerCase()) //||
      //this.getFournisseurByOperation(paiement).includes(this.searchPaiementQuery.toLowerCase())
    );
    this.currentPagePaiement = 1;
    //}

  }


  get panier(): FormArray {
    return this.bonForm.get('panier') as FormArray;
  }

  addArticle(): void {
    this.panier.push(this.fb.group({
      produit: ['', Validators.required],
      uniteStock: [''],
      quantite: [1, Validators.required],
      prixUnitaire: [0, Validators.required]
    }));
    //this.filteredProduits.push([]);
  }

  removeArticle(index: number): void {
    this.panier.removeAt(index);
    this.filteredProduits.splice(index, 1);
    this.updateTotal();
  }

  /* filterProduits(index: number): void {
    const searchTerm = this.panier.at(index).get('produit')?.value.toLowerCase();
    if (searchTerm) {
      this.filteredProduits[index] = this.produits.filter(p => p.nom.toLowerCase().includes(searchTerm));
    } else {
      this.filteredProduits[index] = [];
    }
  }

  selectProduit(index: number, produit: any): void {
    this.panier.at(index).patchValue({
      produit: produit.nom,
      quantite: produit.quantite,
      uniteStock: produit.uniteStock,
      prixUnitaire: produit.prixUnitaire
    });
    this.filteredProduits[index] = [];
    this.updateTotal();
  } */

  applyProduit(index: number): void {
    setTimeout(() => this.filteredProduits[index] = [], 200); // Masquer les suggestions après sélection
  }

  updateTotal(): void {

    let total = 0;
    this.panier.controls.forEach((group: any) => {
      total += (group.value.quantite * group.value.prixUnitaire);
    });
    this.totalPanier = total;
    this.totalBon = total - this.bonForm.value.remise;
    this.bonForm.get('total')?.setValue(total);
  }

  submitBonBis(): void {
    console.log('Bon enregistré', this.bonForm.value);
  }

  // Fonction pour générer le numéro du bon
  generateBonNumber(date: Date): string {
    const year = date.getFullYear();  // Année (ex: 2025)
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Mois (ex: 02 pour février)
    const day = String(date.getDate()).padStart(2, '0');  // Jour (ex: 12)
    const hour = String(date.getHours()).padStart(2, '0');  // Heure (ex: 09)
    const minute = String(date.getMinutes()).padStart(2, '0');  // Minute (ex: 05)
    const second = String(date.getSeconds()).padStart(2, '0');  // Seconde (ex: 08)

    // Format: BON-YYYYMMDD-HHMMSS
    return `BON-${year}${month}${day}-${hour}${minute}${second}`;
  }

  // Désactiver tous les champs du panier et le bouton "Ajouter un article"
disablePanier() {
  this.panier.disable(); // Désactive tous les champs du panier
  this.panierDisabled = true; // Désactive le bouton "Ajouter un article"
}

// Réinitialiser tous les champs du panier et réactiver le bouton "Ajouter un article"
resetPanier() {
  this.panier.clear(); // Réinitialise tous les champs du panier
  this.panier.enable(); // Réactive les champs du panier
  this.panierDisabled = false; // Réactive le bouton "Ajouter un article"
}

  enablePanier() {
    this.panier.enable(); // Réactive tous les champs du panier
    this.panierDisabled = false;
  }

  toggleStatut(user: Client) {
        user.statut = !user.statut;
      }

  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;

    // Réinitialiser les champs inutilisés pour éviter d'enregistrer des valeurs incorrectes
    if (this.typeBon !== 'avoir') {
      this.bonForm.patchValue({
        refBonOrigine: '', motifAvoir: '', montantAvoir: '',
        dateBonOrigine: '', clientAvoir: ''
      });
    }

    if (this.typeBon !== 'livraison') {
      this.bonForm.patchValue({
        adresseLivraison: '', livreur: '', telephoneLivreur: '',
        dateLivraison: '', instructionsLivraison: ''
      });
    }

    // Gestion des validations dynamiques
    this.updateValidations();
  }

  updateValidations(): void {
    // Reset des validations
    const fields = ['refBonOrigine', 'motifAvoir', 'montantAvoir', 'dateBonOrigine', 'clientAvoir',
                    'adresseLivraison', 'livreur', 'telephoneLivreur', 'dateLivraison', 'instructionsLivraison'];

    fields.forEach(field => this.bonForm.get(field)?.clearValidators());

    // Appliquer les validations selon le type de bon
    if (this.typeBon === 'avoir') {
      this.bonForm.get('refBonOrigine')?.setValidators(Validators.required);
      this.bonForm.get('motifAvoir')?.setValidators(Validators.required);
      this.bonForm.get('montantAvoir')?.setValidators([Validators.required, Validators.min(1)]);
      this.bonForm.get('dateBonOrigine')?.setValidators(Validators.required);
      this.bonForm.get('clientAvoir')?.setValidators(Validators.required);
    }

    if (this.typeBon === 'livraison') {
      this.bonForm.get('adresseLivraison')?.setValidators(Validators.required);
      this.bonForm.get('livreur')?.setValidators(Validators.required);
      this.bonForm.get('telephoneLivreur')?.setValidators([Validators.required, Validators.pattern(/^\d{9,15}$/)]);
      this.bonForm.get('dateLivraison')?.setValidators(Validators.required);
      this.bonForm.get('instructionsLivraison')?.setValidators(Validators.maxLength(500));
    }

    this.bonForm.updateValueAndValidity();
 }

 loadPanierBonOrigine(): void {
 /*  const refBon = this.bonForm.get('refBonOrigine')?.value;

  if (!refBon) return;

  // Simuler une requête API pour récupérer le bon d'origine
  this.bonService.getBonByReference(refBon).subscribe(bonOrigine => {
    if (bonOrigine) {
      this.bonForm.patchValue({
        clientAvoir: bonOrigine.clientId,
        montantAvoir: bonOrigine.total,  // Calculer en fonction des articles retournés
      });

      // Charger les produits du bon d'origine dans le panier
      this.panier.clear();
      bonOrigine.panier.forEach(article: => {
        this.panier.push(this.fb.group({
          produit: [article.produit],
          quantite: [article.quantite, Validators.required],
          prixUnitaire: [article.prixUnitaire]
        }));
      });
    } else {
      alert("Bon d'origine introuvable !");
    }
  }); */
}
// Méthode pour retourner un bon
retournerBon(bon: any) {
  const confirmation = confirm(`Voulez-vous vraiment retourner le bon Nº ${bon.numero} ?`);
  if (confirmation) {
    // Ici, on peut envoyer une requête pour annuler ou rembourser le bon
    console.log(`Bon Nº ${bon.numero} retourné !`);

    // Exemple : Mise à jour du statut dans la base de données (remplace par ton service API)
    bon.status = "Retourné";

    // Affichage d'un message (si tu as un système de notifications)
    alert(`Le bon Nº ${bon.numero} a été retourné avec succès !`);
  }
}

filterProduits() {
  console.log("Recherche :", this.searchInput); // Vérifier si la saisie est bien détectée
  const search = this.searchInput.trim().toLowerCase();
  console.log("Recherche :", search); // Vérifier si la saisie est bien détectée
  if (search.length > 0) {
    this.filteredProduits = this.produits.filter(prod => prod.nom.toLowerCase().includes(search));
  } else {
    this.filteredProduits = [];
  }
}

selectProduit(prod: any) {
  // Ajouter directement le produit au panier
  console.log("Produit sélectionné :", prod); // Vérifier que le bon produit est sélectionné
  this.panier.push(this.fb.group({
    produit: [prod.nom, Validators.required],
    uniteStock: [prod.uniteStock, Validators.required],
    quantite: [1, [Validators.required, Validators.min(1)]],
    prixUnitaire: [prod.prixUnitaire, Validators.required]
  }));

  // Effacer la recherche et la liste des suggestions
  this.searchInput = '';
  this.filteredProduits = [];
  this.updateTotal();
}
/* trackByFn(index: number, item: any): number {
  return item.id;
} */

// 🔍 Filtrer les opérations du client selon la période
  filtrerOperations() {
    if (!this.selectedClient || !this.startDate || !this.endDate) {
      console.log("Aucun client sélectionné ou période invalide");
      return;
    }

    // Convertir startDate et endDate en objets Date
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999); // Pour inclure toute la journée complète

    console.log("🔍 Période de filtrage :", start.toISOString(), "->", end.toISOString());

    this.filteredOperations = this.selectedClient.operations.filter(op => {
      if (!op.dateOperation) {
        console.log("⚠ Opération ignorée (pas de date) :", op);
        return false;
      }

      // Vérification du type de dateOperation
      console.log("🔹 Opération ID:", op.id);
      console.log("   ➡ Type de dateOperation:", typeof op.dateOperation);
      console.log("   ➡ Valeur brute:", op.dateOperation);

      // Convertir en Date si ce n'est pas déjà le cas
      const opDate = op.dateOperation instanceof Date ? op.dateOperation : new Date(op.dateOperation);

      console.log("   📅 Date convertie :", opDate.toISOString());

      const isInRange = opDate >= start && opDate <= end;
      console.log("   ✅ Passe le filtre :", isInRange);

      return isInRange;
    });

    console.log("📌 Opérations filtrées :", this.filteredOperations);
  }

  // 🎯 Méthode appelée quand on clique sur un client
  selectClient() {
    if (!this.selectedClient) return;

  // Définir une période de départ par défaut (ex : début du mois en cours)
  const today = new Date();
  this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
  this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui

  this.filtrerOperations();
  }

  getBonByOperation(operation: Operation): any {
    return this.filteredBons.find(bon => bon.id === operation.bonId) || null;
  }

  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.rowsPerPage);
  }

  onRowsPerPageChange(event: any) {
    this.rowsPerPage = Number(event.target.value);

    // Réinitialiser les pages à 1 pour éviter un problème d'affichage
    this.currentPageClient = 1;
    this.currentPageBon = 1;
    this.currentPagePaiement = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }
  getClientByOperation(operation: any): any {
    // Vérifier si l'opération est de type Paiement
    if (operation instanceof Paiement) {
      return this.filteredClients.find(four => four.id === operation.clientId) || null;
    }
    else if (operation instanceof Bon){
      return this.filteredClients.find(four => four.id === operation.clientId) || null;
    }

    // Autres cas
    return this.filteredClients.find(four => four.id === operation.clientId) || null;
  }

    toggleDetails(index: number, typeInstance: any) {
      if (typeInstance instanceof Client) {
        this.selectedBonIndexC = this.selectedBonIndexC === index ? null : index;
      }
      else if(typeInstance instanceof Bon){
        this.selectedBonIndexB = this.selectedBonIndexB === index ? null : index;
      }
      else if(typeInstance instanceof Paiement){
        this.selectedBonIndexP = this.selectedBonIndexP === index ? null : index;
      }
      else if(typeInstance instanceof Operation){
        this.selectedBonIndexO = this.selectedBonIndexO === index ? null : index;
      }

    }

  getBonBypaiement(operation: Paiement): any {
    return this.filteredBons.find(bon => bon.id === operation.bonId) || null;
  }
  // Fonction pour valider un bon
validerBon(bon: any): void {
  // Vérification si le bon peut être validé (par exemple, statut = 'livré')
  if (bon.statut === 'livré') {
    bon.statut = 'validé'; // Mise à jour du statut
    // Sauvegarder dans la base de données ou API
    this.updateBon(bon);
    alert('Bon validé avec succès.');
  } else {
    alert('Le bon ne peut pas être validé dans cet état.');
  }
}

// Fonction pour modifier un bon
modifierBon(bon: any): void {
  // Vérification si le bon peut être modifié (par exemple, statut = 'brouillon')
  if (bon.statut === 'brouillon') {
    // Logic to modify the bon data
    //this.openEditModal(bon); // Ouvrir un modal pour modifier le bon
  } else {
    alert('Le bon ne peut pas être modifié dans cet état.');
  }
}

// Fonction pour supprimer un bon
supprimerBon(bon: any): void {
  // Vérification du statut avant de supprimer
  if (bon.statut === 'brouillon' || bon.statut === 'commandé') {
    // Supprimer le bon
    this.deleteBon(bon.id); // Appel à une fonction pour supprimer le bon
    alert('Bon supprimé avec succès.');
  } else {
    alert('Le bon ne peut pas être supprimé dans cet état.');
  }
}

// Fonction pour annuler un bon (seulement si validé et non facturé)
annulerBon(bon: any): void {
  if (bon.statut === 'validé' && !bon.facturé) {
    bon.statut = 'annulé'; // Mise à jour du statut
    this.updateBon(bon);
    alert('Bon annulé.');
  } else {
    alert('Le bon ne peut pas être annulé.');
  }
}

// Fonction pour facturer un bon
facturerBon(bon: any): void {
  if (bon.statut === 'validé' && !bon.facturé) {
    bon.facturé = true; // Marquer comme facturé
    this.updateBon(bon);
    alert('Bon facturé.');
  } else {
    alert('Le bon ne peut pas être facturé.');
  }
}

// Fonction pour suivre le paiement du bon
suiviPaiement(bon: any): void {
  if (bon.facturé && !bon.payé) {
    // Logique pour suivre le paiement
    //this.openPaymentTrackingModal(bon); // Ouvrir un modal pour suivre le paiement
  } else {
    alert('Aucun paiement à suivre.');
  }
}

// Fonction pour imprimer le bon
imprimerBon(bon: any): void {
  // Logique d'impression du bon (ici, on simule l'impression)
  window.print(); // Pour l'impression
  alert('Bon envoyé à l\'impression.');
}

// Fonction pour mettre à jour un bon
updateBon(bon: any): void {
  // Implémenter la logique pour mettre à jour le bon dans la base de données ou via une API
  // Par exemple : this.apiService.updateBon(bon).subscribe(response => { console.log(response); });
  console.log('Bon mis à jour:', bon);
}

// Fonction pour supprimer un bon
deleteBon(bonId: number): void {
  // Implémenter la logique pour supprimer le bon via l'API ou dans la base de données
  // Par exemple : this.apiService.deleteBon(bonId).subscribe(response => { console.log(response); });
  console.log('Bon supprimé:', bonId);
}

}
