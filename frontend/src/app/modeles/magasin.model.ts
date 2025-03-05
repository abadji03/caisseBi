import { Depense, Recette } from "./finance.model";
import { Panier } from "./panier.model";
import { Produits } from "./produit.modele";
import { Transfert } from "./transfert.model";

export class Magasin {
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
