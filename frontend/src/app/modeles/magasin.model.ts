export class Magasin {
    id?: number;                 // Identifiant unique du magasin
    nom?: string;                // Nom de la succursale
    adresse?: string;            // Adresse complète
    ville?: string;              // Ville du magasin
    telephone?: string;          // Numéro de téléphone
    email?: string;              // Email de contact
    responsableId?: number;      // ID du responsable du magasin
    capaciteStock?: number;      // Capacité maximale du stock
    produitsEnStock?: number;    // Nombre total de produits en stock
    chiffreAffaires?: number;    // Chiffre d’affaires total
    nombreVentes?: number;       // Nombre de ventes effectuées
    statut?: "actif" | "inactif"; // État du magasin
    dateCreation?: Date;         // Date de création du magasin
    derniereMiseAJour?: Date;    // Dernière modification

    // Liste des employés (optionnel)
    employes?: { id: number; nom: string; role: string }[];

    // Constructeur avec initialisation dynamique
    constructor(data?: Partial<Magasin>) {
      Object.assign(this, data);
    }
  }
