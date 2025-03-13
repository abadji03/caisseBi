import { MouvementsStock, Stock } from "./entrees-sorties.model";
import { Depense, Recette } from "./finance.model";
import { Panier } from "./panier.model";
import { Produits } from "./produit.modele";
import { Transfert } from "./transfert.model";

/* export class Magasin {
    id!: number;                 // Identifiant unique du magasin
    nom?: string;                // Nom de la succursale
    adresse?: string;            // Adresse complète
    ville?: string;              // Ville du magasin
    telephone?: string;          // Numéro de téléphone
    email?: string;              // Email de contact
    responsableId?: number;      // ID du responsable du magasin
    capaciteStock?: number;      // Capacité maximale du stock
    produitsEnStock?: Produits[];    // Nombre total de produits en stock
    chiffreAffaires?: number;    // Chiffre d’affaires total
    ventes?: Panier[];
    depenses?: Depense[];
    recettes?: Recette[];
    statut?: "actif" | "inactif"; // État du magasin
    dateCreation?: Date;         // Date de création du magasin
    derniereMiseAJour?: Date;    // Dernière modification
    transferts?: Transfert[];

    // Constructeur avec initialisation dynamique
    constructor(data?: Partial<Magasin>) {
      Object.assign(this, data);
    }
  }
 */

  export class Magasin {
    id!: number;
    nom!: string;
    adresse?: string;
    ville?: string;
    telephone?: string;
    email?: string;
    responsableId?: number;
    capaciteStock?: number;
    chiffreAffaires?: number;
    ventes?: Panier[];
    depenses?: Depense[];
    mouvements?: MouvementsStock[];
    recettes?: Recette[];
    statut?: "Actif" | "Inactif";
    dateCreation?: Date;
    derniereMiseAJour?: Date;
    transferts?: Transfert[];
    stock?: Stock[];             // Référence au stock du magasin



    // Constructeur avec initialisation dynamique
    constructor(data?: Partial<Magasin>) {
      Object.assign(this, {
        statut: "actif",  // Statut par défaut
        capaciteStock: 0, // Capacité de stock par défaut
        ...data           // Étend avec les données passées
      });
    }

    // Méthode pour calculer le chiffre d'affaires total si ce n'est pas déjà défini
    calculerChiffreAffaires(): number {
      if (this.ventes && this.ventes.length > 0) {
        this.chiffreAffaires = this.ventes.reduce((total, vente) => total + vente.totalTTC, 0);
      }
      return this.chiffreAffaires ?? 0;
    }

    // Méthode pour calculer la capacité en stock du magasin
    calculerCapaciteStock(): number {
      // Si le stock du magasin est défini, on calcule la somme des quantités disponibles
      this.capaciteStock = this.stock?.reduce((total, stockItem) => total + (stockItem.quantiteDisponible ?? 0), 0) ?? 0;
      return this.capaciteStock;
    }


    // Méthode pour activer ou désactiver un magasin
    modifierStatut(nouveauStatut: "Actif" | "Inactif"): void {
      this.statut = nouveauStatut;
    }

    // Méthode pour ajouter une vente
    ajouterVente(vente: Panier): void {
      if (!this.ventes) {
        this.ventes = [];
      }
      this.ventes.push(vente);
      this.calculerChiffreAffaires(); // Met à jour le chiffre d'affaires après chaque vente
    }

    // Méthode pour ajouter une dépense
    ajouterDepense(depense: Depense): void {
      if (!this.depenses) {
        this.depenses = [];
      }
      this.depenses.push(depense);
    }

    // Méthode pour ajouter une recette
    ajouterRecette(recette: Recette): void {
      if (!this.recettes) {
        this.recettes = [];
      }
      this.recettes.push(recette);
    }
  }
