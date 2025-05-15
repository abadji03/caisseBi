import { Client } from "./clients.model";
import { MouvementsStock, Stock } from "./entrees-sorties.model";
import { Categorie, Depense, Recette } from "./finance.model";
import { Magasin } from "./magasin.model";
import { ModePaiement, Paiement } from "./paiement.model";
import { ArticlePanier, Panier } from "./panier.model";
import { Produits } from "./produit.modele";
import { Transfert } from "./transfert.model";
import { User } from "./user.model";

export const magasins: Magasin[] = [
    new Magasin({ id: 1, nom: "SuperMarket Paris", adresse: "12 Rue de la République", ville: "Paris", telephone: "0145863254", email: "paris@supermarket.com", responsableId: 101, capaciteStock: 5000, chiffreAffaires: 25000, statut: "Actif", dateCreation: new Date("2022-01-15") }),
    new Magasin({ id: 2, nom: "SuperMarket Lyon", adresse: "45 Avenue des Ternes", ville: "Lyon", telephone: "0478563214", email: "lyon@supermarket.com", responsableId: 102, capaciteStock: 3500, chiffreAffaires: 18000, statut: "Actif", dateCreation: new Date("2022-03-20") }),
    new Magasin({ id: 3, nom: "SuperMarket Marseille", adresse: "30 Boulevard Michelet", ville: "Marseille", telephone: "0491326547", email: "marseille@supermarket.com", responsableId: 103, capaciteStock: 4000, chiffreAffaires: 21000, statut: "Inactif", dateCreation: new Date("2022-05-10") })
];

export const produits: Produits[] = [
    // Produits pour Magasin 1 (1-10)
    new Produits({ id: 1, famille: "Alimentation", designation: "Pâtes Barilla", unite: "Kg", prixAchatUnitaire: 1.20, prixVenteUnitaire: 2.50, perissable: false, codeBarre: "123456789012" }),
    new Produits({ id: 2, famille: "Boissons", designation: "Eau minérale 1L", unite: "Bouteille", prixAchatUnitaire: 0.30, prixVenteUnitaire: 0.80, perissable: false, codeBarre: "234567890123" }),
    new Produits({ id: 3, famille: "Fruits", designation: "Pommes Golden", unite: "Kg", prixAchatUnitaire: 1.50, prixVenteUnitaire: 2.80, perissable: true, codeBarre: "345678901234" }),
    new Produits({ id: 4, famille: "Laitage", designation: "Lait entier", unite: "Litre", prixAchatUnitaire: 0.80, prixVenteUnitaire: 1.50, perissable: true, codeBarre: "456789012345" }),
    new Produits({ id: 5, famille: "Boulangerie", designation: "Pain complet", unite: "Pièce", prixAchatUnitaire: 0.60, prixVenteUnitaire: 1.20, perissable: true, codeBarre: "567890123456" }),
    new Produits({ id: 6, famille: "Viandes", designation: "Steak haché", unite: "Kg", prixAchatUnitaire: 8.50, prixVenteUnitaire: 12.00, perissable: true, codeBarre: "678901234567" }),
    new Produits({ id: 7, famille: "Electroménager", designation: "Cafetière", unite: "Pièce", prixAchatUnitaire: 25.00, prixVenteUnitaire: 39.99, perissable: false, codeBarre: "789012345678" }),
    new Produits({ id: 8, famille: "Entretien", designation: "Lessive 3L", unite: "Bouteille", prixAchatUnitaire: 5.80, prixVenteUnitaire: 9.50, perissable: false, codeBarre: "890123456789" }),
    new Produits({ id: 9, famille: "Surgelés", designation: "Pizza 4 fromages", unite: "Pièce", prixAchatUnitaire: 2.30, prixVenteUnitaire: 4.50, perissable: true, codeBarre: "901234567890" }),
    new Produits({ id: 10, famille: "Hygiène", designation: "Dentifrice", unite: "Tube", prixAchatUnitaire: 1.10, prixVenteUnitaire: 2.20, perissable: false, codeBarre: "012345678901" }),

    // Produits pour Magasin 2 (11-20)
    new Produits({ id: 11, famille: "Alimentation", designation: "Riz Basmati", unite: "Kg", prixAchatUnitaire: 1.80, prixVenteUnitaire: 3.20, perissable: false, codeBarre: "112345678901" }),
    new Produits({ id: 12, famille: "Boissons", designation: "Jus d'orange 1L", unite: "Bouteille", prixAchatUnitaire: 1.20, prixVenteUnitaire: 2.50, perissable: true, codeBarre: "212345678901" }),
    new Produits({ id: 13, famille: "Fruits", designation: "Bananes", unite: "Kg", prixAchatUnitaire: 1.20, prixVenteUnitaire: 2.30, perissable: true, codeBarre: "312345678901" }),
    new Produits({ id: 14, famille: "Laitage", designation: "Yaourt nature", unite: "Pot", prixAchatUnitaire: 0.40, prixVenteUnitaire: 0.80, perissable: true, codeBarre: "412345678901" }),
    new Produits({ id: 15, famille: "Boulangerie", designation: "Baguette", unite: "Pièce", prixAchatUnitaire: 0.35, prixVenteUnitaire: 0.90, perissable: true, codeBarre: "512345678901" }),
    new Produits({ id: 16, famille: "Viandes", designation: "Poulet entier", unite: "Kg", prixAchatUnitaire: 6.50, prixVenteUnitaire: 9.90, perissable: true, codeBarre: "612345678901" }),
    new Produits({ id: 17, famille: "Electroménager", designation: "Grille-pain", unite: "Pièce", prixAchatUnitaire: 18.00, prixVenteUnitaire: 29.99, perissable: false, codeBarre: "712345678901" }),
    new Produits({ id: 18, famille: "Entretien", designation: "Nettoyant sol", unite: "Litre", prixAchatUnitaire: 3.50, prixVenteUnitaire: 6.20, perissable: false, codeBarre: "812345678901" }),
    new Produits({ id: 19, famille: "Surgelés", designation: "Lasagnes", unite: "Pièce", prixAchatUnitaire: 2.80, prixVenteUnitaire: 5.20, perissable: true, codeBarre: "912345678901" }),
    new Produits({ id: 20, famille: "Hygiène", designation: "Shampoing", unite: "Flacon", prixAchatUnitaire: 2.30, prixVenteUnitaire: 4.50, perissable: false, codeBarre: "022345678901" }),

    // Produits pour Magasin 3 (21-30)
    new Produits({ id: 21, famille: "Alimentation", designation: "Farine T55", unite: "Kg", prixAchatUnitaire: 0.90, prixVenteUnitaire: 1.80, perissable: false, codeBarre: "122345678901" }),
    new Produits({ id: 22, famille: "Boissons", designation: "Soda 1.5L", unite: "Bouteille", prixAchatUnitaire: 0.80, prixVenteUnitaire: 1.90, perissable: false, codeBarre: "222345678901" }),
    new Produits({ id: 23, famille: "Fruits", designation: "Oranges", unite: "Kg", prixAchatUnitaire: 1.60, prixVenteUnitaire: 2.90, perissable: true, codeBarre: "322345678901" }),
    new Produits({ id: 24, famille: "Laitage", designation: "Fromage râpé", unite: "Kg", prixAchatUnitaire: 7.50, prixVenteUnitaire: 12.00, perissable: true, codeBarre: "422345678901" }),
    new Produits({ id: 25, famille: "Boulangerie", designation: "Croissant", unite: "Pièce", prixAchatUnitaire: 0.45, prixVenteUnitaire: 1.00, perissable: true, codeBarre: "522345678901" }),
    new Produits({ id: 26, famille: "Viandes", designation: "Saumon frais", unite: "Kg", prixAchatUnitaire: 12.00, prixVenteUnitaire: 18.50, perissable: true, codeBarre: "622345678901" }),
    new Produits({ id: 27, famille: "Electroménager", designation: "Bouilloire", unite: "Pièce", prixAchatUnitaire: 15.00, prixVenteUnitaire: 24.99, perissable: false, codeBarre: "722345678901" }),
    new Produits({ id: 28, famille: "Entretien", designation: "Désodorisant", unite: "Spray", prixAchatUnitaire: 2.20, prixVenteUnitaire: 4.00, perissable: false, codeBarre: "822345678901" }),
    new Produits({ id: 29, famille: "Surgelés", designation: "Glace vanille", unite: "Pot", prixAchatUnitaire: 2.50, prixVenteUnitaire: 4.80, perissable: true, codeBarre: "922345678901" }),
    new Produits({ id: 30, famille: "Hygiène", designation: "Savon", unite: "Pièce", prixAchatUnitaire: 0.80, prixVenteUnitaire: 1.50, perissable: false, codeBarre: "032345678901" })
];

// Stocks pour chaque magasin (10 par magasin)
export const stocks: Stock[] = [
    // Magasin 1 (Paris) - Stocks pour produits 1-10
    new Stock({
      id: 1, produitId: 1, magasinId: 1, quantiteTotale: 150,
      quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 20,
      dernierPrixAchat: 1.20, prixVenteUnitaire: 2.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-15")
    }),
    new Stock({
      id: 2, produitId: 2, magasinId: 1, quantiteTotale: 300,
      quantiteReservee: 50, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.30, prixVenteUnitaire: 0.80, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-16")
    }),
    new Stock({
      id: 3, produitId: 3, magasinId: 1, quantiteTotale: 80,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.50, prixVenteUnitaire: 2.80, datePeremption: new Date("2025-11-20"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-14")
    }),
    new Stock({
      id: 4, produitId: 4, magasinId: 1, quantiteTotale: 120,
      quantiteReservee: 30, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.50, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-17")
    }),
    new Stock({
      id: 5, produitId: 5, magasinId: 1, quantiteTotale: 200,
      quantiteReservee: 40, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 0.60, prixVenteUnitaire: 1.20, datePeremption: new Date("2025-05-25"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-18")
    }),
    new Stock({
      id: 6, produitId: 6, magasinId: 1, quantiteTotale: 50,
      quantiteReservee: 10, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 8.50, prixVenteUnitaire: 12.00, datePeremption: new Date("2025-11-10"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-19")
    }),
    new Stock({
      id: 7, produitId: 7, magasinId: 1, quantiteTotale: 25,
      quantiteReservee: 5, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 25.00, prixVenteUnitaire: 39.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-20")
    }),
    new Stock({
      id: 8, produitId: 8, magasinId: 1, quantiteTotale: 60,
      quantiteReservee: 12, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 5.80, prixVenteUnitaire: 9.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-21")
    }),
    new Stock({
      id: 9, produitId: 9, magasinId: 1, quantiteTotale: 75,
      quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 2.30, prixVenteUnitaire: 4.50, datePeremption: new Date("2024-02-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-22")
    }),
    new Stock({
      id: 10, produitId: 10, magasinId: 1, quantiteTotale: 180,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 1.10, prixVenteUnitaire: 2.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-23")
    }),

    // Magasin 2 (Lyon) - Stocks pour produits 11-20
    new Stock({
      id: 11, produitId: 11, magasinId: 2, quantiteTotale: 120,
      quantiteReservee: 25, seuilAlerte: 10, seuilReapprovisionnement: 20,
      dernierPrixAchat: 1.80, prixVenteUnitaire: 3.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-15")
    }),
    new Stock({
      id: 12, produitId: 12, magasinId: 2, quantiteTotale: 150,
      quantiteReservee: 30, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 1.20, prixVenteUnitaire: 2.50, datePeremption: new Date("2025-11-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-16")
    }),
    new Stock({
      id: 13, produitId: 13, magasinId: 2, quantiteTotale: 90,
      quantiteReservee: 20, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.20, prixVenteUnitaire: 2.30, datePeremption: new Date("2025-11-01"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-17")
    }),
    new Stock({
      id: 14, produitId: 14, magasinId: 2, quantiteTotale: 200,
      quantiteReservee: 40, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.40, prixVenteUnitaire: 0.80, datePeremption: new Date("2025-11-10"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-18")
    }),
    new Stock({
      id: 15, produitId: 15, magasinId: 2, quantiteTotale: 180,
      quantiteReservee: 50, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.35, prixVenteUnitaire: 0.90, datePeremption: new Date("2025-05-28"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-19")
    }),
    new Stock({
      id: 16, produitId: 16, magasinId: 2, quantiteTotale: 60,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 6.50, prixVenteUnitaire: 9.90, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-20")
    }),
    new Stock({
      id: 17, produitId: 17, magasinId: 2, quantiteTotale: 30,
      quantiteReservee: 8, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 18.00, prixVenteUnitaire: 29.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-21")
    }),
    new Stock({
      id: 18, produitId: 18, magasinId: 2, quantiteTotale: 70,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 3.50, prixVenteUnitaire: 6.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-22")
    }),
    new Stock({
      id: 19, produitId: 19, magasinId: 2, quantiteTotale: 85,
      quantiteReservee: 25, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 2.80, prixVenteUnitaire: 5.20, datePeremption: new Date("2024-01-20"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-23")
    }),
    new Stock({
      id: 20, produitId: 20, magasinId: 2, quantiteTotale: 140,
      quantiteReservee: 30, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 2.30, prixVenteUnitaire: 4.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-24")
    }),

    // Magasin 3 (Marseille) - Stocks pour produits 21-30
    new Stock({
      id: 21, produitId: 21, magasinId: 3, quantiteTotale: 100,
      quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 20,
      dernierPrixAchat: 0.90, prixVenteUnitaire: 1.80, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-15")
    }),
    new Stock({
      id: 22, produitId: 22, magasinId: 3, quantiteTotale: 180,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.90, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-16")
    }),
    new Stock({
      id: 23, produitId: 23, magasinId: 3, quantiteTotale: 70,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.60, prixVenteUnitaire: 2.90, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-17")
    }),
    new Stock({
      id: 24, produitId: 24, magasinId: 3, quantiteTotale: 40,
      quantiteReservee: 10, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 7.50, prixVenteUnitaire: 12.00, datePeremption: new Date("2025-11-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-18")
    }),
    new Stock({
      id: 25, produitId: 25, magasinId: 3, quantiteTotale: 150,
      quantiteReservee: 40, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.45, prixVenteUnitaire: 1.00, datePeremption: new Date("2025-05-30"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-19")
    }),
    new Stock({
      id: 26, produitId: 26, magasinId: 3, quantiteTotale: 35,
      quantiteReservee: 8, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 12.00, prixVenteUnitaire: 18.50, datePeremption: new Date("2025-11-08"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-20")
    }),
    new Stock({
      id: 27, produitId: 27, magasinId: 3, quantiteTotale: 20,
      quantiteReservee: 5, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 15.00, prixVenteUnitaire: 24.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-21")
    }),
    new Stock({
      id: 28, produitId: 28, magasinId: 3, quantiteTotale: 65,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 2.20, prixVenteUnitaire: 4.00, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-22")
    }),
    new Stock({
      id: 29, produitId: 29, magasinId: 3, quantiteTotale: 55,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 2.50, prixVenteUnitaire: 4.80, datePeremption: new Date("2024-03-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-05-23")
    }),
    new Stock({
      id: 30, produitId: 30, magasinId: 3, quantiteTotale: 160,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-05-24")
    })
  ];

  export const mouvements: MouvementsStock[] = [
    // Magasin 1 (Paris) - 15 mouvements
    new MouvementsStock({
      id: 1, ref: "MV-PAR-2025-001", produitId: 1, magasinId: 1, stockId: 1,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.20,
      acteurId: 201, description: "Livraison initiale", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 2, ref: "MV-PAR-2025-002", produitId: 1, magasinId: 1, stockId: 1,
      typeMouvement: "Sortie", quantite: 30, prixUnitaire: 2.50,
      acteurId: 301, description: "Vente client", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 3, ref: "MV-PAR-2025-003", produitId: 2, magasinId: 1, stockId: 2,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.30,
      acteurId: 202, description: "Réapprovisionnement", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 4, ref: "MV-PAR-2025-004", produitId: 3, magasinId: 1, stockId: 3,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 1.50,
      acteurId: 203, description: "Livraison fruits", dateMouvement: new Date("2025-05-14")
    }),
    new MouvementsStock({
      id: 5, ref: "MV-PAR-2025-005", produitId: 4, magasinId: 1, stockId: 4,
      typeMouvement: "Entree", quantite: 80, prixUnitaire: 0.80,
      acteurId: 204, description: "Livraison laitage", dateMouvement: new Date("2025-05-17")
    }),
    new MouvementsStock({
      id: 6, ref: "MV-PAR-2025-006", produitId: 5, magasinId: 1, stockId: 5,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.60,
      acteurId: 205, description: "Livraison boulangerie", dateMouvement: new Date("2025-05-18")
    }),
    new MouvementsStock({
      id: 7, ref: "MV-PAR-2025-007", produitId: 6, magasinId: 1, stockId: 6,
      typeMouvement: "Entree", quantite: 30, prixUnitaire: 8.50,
      acteurId: 206, description: "Livraison viande", dateMouvement: new Date("2025-05-19")
    }),
    new MouvementsStock({
      id: 8, ref: "MV-PAR-2025-008", produitId: 7, magasinId: 1, stockId: 7,
      typeMouvement: "Entree", quantite: 15, prixUnitaire: 25.00,
      acteurId: 207, description: "Livraison électroménager", dateMouvement: new Date("2025-05-20")
    }),
    new MouvementsStock({
      id: 9, ref: "MV-PAR-2025-009", produitId: 8, magasinId: 1, stockId: 8,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 5.80,
      acteurId: 208, description: "Livraison entretien", dateMouvement: new Date("2025-05-21")
    }),
    new MouvementsStock({
      id: 10, ref: "MV-PAR-2025-050", produitId: 9, magasinId: 1, stockId: 9,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 2.30,
      acteurId: 209, description: "Livraison surgelés", dateMouvement: new Date("2025-05-22")
    }),
    new MouvementsStock({
      id: 11, ref: "MV-PAR-2025-051", produitId: 10, magasinId: 1, stockId: 10,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 1.10,
      acteurId: 210, description: "Livraison hygiène", dateMouvement: new Date("2025-05-23")
    }),
    new MouvementsStock({
      id: 12, ref: "MV-PAR-2025-052", produitId: 2, magasinId: 1, stockId: 2,
      typeMouvement: "Sortie", quantite: 70, prixUnitaire: 0.80,
      acteurId: 302, description: "Vente client", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 13, ref: "MV-PAR-2025-053", produitId: 3, magasinId: 1, stockId: 3,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 2.80,
      acteurId: 303, description: "Vente client", dateMouvement: new Date("2025-05-14")
    }),
    new MouvementsStock({
      id: 14, ref: "MV-PAR-2025-054", produitId: 5, magasinId: 1, stockId: 5,
      typeMouvement: "Sortie", quantite: 80, prixUnitaire: 1.20,
      acteurId: 304, description: "Vente client", dateMouvement: new Date("2025-05-18")
    }),
    new MouvementsStock({
      id: 15, ref: "MV-PAR-2025-055", produitId: 7, magasinId: 1, stockId: 7,
      typeMouvement: "Sortie", quantite: 10, prixUnitaire: 39.99,
      acteurId: 305, description: "Vente client", dateMouvement: new Date("2025-05-20")
    }),

    // Magasin 2 (Lyon) - 15 mouvements
    new MouvementsStock({
      id: 16, ref: "MV-LYO-2025-001", produitId: 11, magasinId: 2, stockId: 11,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 1.80,
      acteurId: 211, description: "Livraison initiale", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 17, ref: "MV-LYO-2025-002", produitId: 11, magasinId: 2, stockId: 11,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 3.20,
      acteurId: 306, description: "Vente client", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 18, ref: "MV-LYO-2025-003", produitId: 12, magasinId: 2, stockId: 12,
      typeMouvement: "Entree", quantite: 80, prixUnitaire: 1.20,
      acteurId: 212, description: "Réapprovisionnement", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 19, ref: "MV-LYO-2025-004", produitId: 13, magasinId: 2, stockId: 13,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.20,
      acteurId: 213, description: "Livraison fruits", dateMouvement: new Date("2025-05-17")
    }),
    new MouvementsStock({
      id: 20, ref: "MV-LYO-2025-005", produitId: 14, magasinId: 2, stockId: 14,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.40,
      acteurId: 214, description: "Livraison laitage", dateMouvement: new Date("2025-05-18")
    }),
    new MouvementsStock({
      id: 21, ref: "MV-LYO-2025-006", produitId: 15, magasinId: 2, stockId: 15,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.35,
      acteurId: 215, description: "Livraison boulangerie", dateMouvement: new Date("2025-05-19")
    }),
    new MouvementsStock({
      id: 22, ref: "MV-LYO-2025-007", produitId: 16, magasinId: 2, stockId: 16,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 6.50,
      acteurId: 216, description: "Livraison viande", dateMouvement: new Date("2025-05-20")
    }),
    new MouvementsStock({
      id: 23, ref: "MV-LYO-2025-008", produitId: 17, magasinId: 2, stockId: 17,
      typeMouvement: "Entree", quantite: 20, prixUnitaire: 18.00,
      acteurId: 217, description: "Livraison électroménager", dateMouvement: new Date("2025-05-21")
    }),
    new MouvementsStock({
      id: 24, ref: "MV-LYO-2025-009", produitId: 18, magasinId: 2, stockId: 18,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 3.50,
      acteurId: 218, description: "Livraison entretien", dateMouvement: new Date("2025-05-22")
    }),
    new MouvementsStock({
      id: 25, ref: "MV-LYO-2025-050", produitId: 19, magasinId: 2, stockId: 19,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 2.80,
      acteurId: 219, description: "Livraison surgelés", dateMouvement: new Date("2025-05-23")
    }),
    new MouvementsStock({
      id: 26, ref: "MV-LYO-2025-051", produitId: 20, magasinId: 2, stockId: 20,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 2.30,
      acteurId: 220, description: "Livraison hygiène", dateMouvement: new Date("2025-05-24")
    }),
    new MouvementsStock({
      id: 27, ref: "MV-LYO-2025-052", produitId: 12, magasinId: 2, stockId: 12,
      typeMouvement: "Sortie", quantite: 50, prixUnitaire: 2.50,
      acteurId: 307, description: "Vente client", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 28, ref: "MV-LYO-2025-053", produitId: 13, magasinId: 2, stockId: 13,
      typeMouvement: "Sortie", quantite: 30, prixUnitaire: 2.30,
      acteurId: 308, description: "Vente client", dateMouvement: new Date("2025-05-17")
    }),
    new MouvementsStock({
      id: 29, ref: "MV-LYO-2025-054", produitId: 15, magasinId: 2, stockId: 15,
      typeMouvement: "Sortie", quantite: 60, prixUnitaire: 0.90,
      acteurId: 309, description: "Vente client", dateMouvement: new Date("2025-05-19")
    }),
    new MouvementsStock({
      id: 30, ref: "MV-LYO-2025-055", produitId: 17, magasinId: 2, stockId: 17,
      typeMouvement: "Sortie", quantite: 12, prixUnitaire: 29.99,
      acteurId: 310, description: "Vente client", dateMouvement: new Date("2025-05-21")
    }),

    // Magasin 3 (Marseille) - 15 mouvements
    new MouvementsStock({
      id: 31, ref: "MV-MAR-2025-001", produitId: 21, magasinId: 3, stockId: 21,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 0.90,
      acteurId: 221, description: "Livraison initiale", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 32, ref: "MV-MAR-2025-002", produitId: 21, magasinId: 3, stockId: 21,
      typeMouvement: "Sortie", quantite: 40, prixUnitaire: 1.80,
      acteurId: 311, description: "Vente client", dateMouvement: new Date("2025-05-15")
    }),
    new MouvementsStock({
      id: 33, ref: "MV-MAR-2025-003", produitId: 22, magasinId: 3, stockId: 22,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.80,
      acteurId: 222, description: "Réapprovisionnement", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 34, ref: "MV-MAR-2025-004", produitId: 23, magasinId: 3, stockId: 23,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.60,
      acteurId: 223, description: "Livraison fruits", dateMouvement: new Date("2025-05-17")
    }),
    new MouvementsStock({
      id: 35, ref: "MV-MAR-2025-005", produitId: 24, magasinId: 3, stockId: 24,
      typeMouvement: "Entree", quantite: 30, prixUnitaire: 7.50,
      acteurId: 224, description: "Livraison laitage", dateMouvement: new Date("2025-05-18")
    }),
    new MouvementsStock({
      id: 36, ref: "MV-MAR-2025-006", produitId: 25, magasinId: 3, stockId: 25,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.45,
      acteurId: 225, description: "Livraison boulangerie", dateMouvement: new Date("2025-05-19")
    }),
    new MouvementsStock({
      id: 37, ref: "MV-MAR-2025-007", produitId: 26, magasinId: 3, stockId: 26,
      typeMouvement: "Entree", quantite: 25, prixUnitaire: 12.00,
      acteurId: 226, description: "Livraison poisson", dateMouvement: new Date("2025-05-20")
    }),
    new MouvementsStock({
      id: 38, ref: "MV-MAR-2025-008", produitId: 27, magasinId: 3, stockId: 27,
      typeMouvement: "Entree", quantite: 15, prixUnitaire: 15.00,
      acteurId: 227, description: "Livraison électroménager", dateMouvement: new Date("2025-05-21")
    }),
    new MouvementsStock({
      id: 39, ref: "MV-MAR-2025-009", produitId: 28, magasinId: 3, stockId: 28,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 2.20,
      acteurId: 228, description: "Livraison entretien", dateMouvement: new Date("2025-05-22")
    }),
    new MouvementsStock({
      id: 40, ref: "MV-MAR-2025-050", produitId: 29, magasinId: 3, stockId: 29,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 2.50,
      acteurId: 229, description: "Livraison surgelés", dateMouvement: new Date("2025-05-23")
    }),
    new MouvementsStock({
      id: 41, ref: "MV-MAR-2025-051", produitId: 30, magasinId: 3, stockId: 30,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.80,
      acteurId: 230, description: "Livraison hygiène", dateMouvement: new Date("2025-05-24")
    }),
    new MouvementsStock({
      id: 42, ref: "MV-MAR-2025-052", produitId: 22, magasinId: 3, stockId: 22,
      typeMouvement: "Sortie", quantite: 80, prixUnitaire: 1.90,
      acteurId: 312, description: "Vente client", dateMouvement: new Date("2025-05-16")
    }),
    new MouvementsStock({
      id: 43, ref: "MV-MAR-2025-053", produitId: 23, magasinId: 3, stockId: 23,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 2.90,
      acteurId: 313, description: "Vente client", dateMouvement: new Date("2025-05-17")
    }),
    new MouvementsStock({
      id: 44, ref: "MV-MAR-2025-054", produitId: 25, magasinId: 3, stockId: 25,
      typeMouvement: "Sortie", quantite: 60, prixUnitaire: 1.00,
      acteurId: 314, description: "Vente client", dateMouvement: new Date("2025-05-19")
    }),
    new MouvementsStock({
      id: 45, ref: "MV-MAR-2025-055", produitId: 27, magasinId: 3, stockId: 27,
      typeMouvement: "Sortie", quantite: 10, prixUnitaire: 24.99,
      acteurId: 315, description: "Vente client", dateMouvement: new Date("2025-05-21")
    })
  ];

export const transferts: Transfert[] = [
    // Transferts depuis Magasin 1 (Paris) - 15 transferts
    new Transfert({ id: 1, reference: "TRF-PAR-001", produitId: 1, quantite: 10, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-05"), statut: "Validé", agentResponsable: 401 }),
    new Transfert({ id: 2, reference: "TRF-PAR-002", produitId: 2, quantite: 20, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-07"), statut: "Validé", agentResponsable: 402 }),
    new Transfert({ id: 3, reference: "TRF-PAR-003", produitId: 3, quantite: 5, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-09"), statut: "En attente", agentResponsable: 403 }),
    new Transfert({ id: 4, reference: "TRF-PAR-004", produitId: 4, quantite: 8, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-11"), statut: "Refusé", motif: "Stock insuffisant", agentResponsable: 404 }),
    new Transfert({ id: 5, reference: "TRF-PAR-005", produitId: 5, quantite: 15, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-13"), statut: "Validé", agentResponsable: 405 }),
    new Transfert({ id: 6, reference: "TRF-PAR-006", produitId: 6, quantite: 3, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-15"), statut: "Validé", agentResponsable: 406 }),
    new Transfert({ id: 7, reference: "TRF-PAR-007", produitId: 7, quantite: 2, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-17"), statut: "En attente", agentResponsable: 407 }),
    new Transfert({ id: 8, reference: "TRF-PAR-008", produitId: 8, quantite: 4, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-19"), statut: "Refusé", motif: "Produit endommagé", agentResponsable: 408 }),
    new Transfert({ id: 9, reference: "TRF-PAR-009", produitId: 9, quantite: 6, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-21"), statut: "Validé", agentResponsable: 409 }),
    new Transfert({ id: 10, reference: "TRF-PAR-010", produitId: 10, quantite: 8, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-23"), statut: "Validé", agentResponsable: 410 }),
    new Transfert({ id: 11, reference: "TRF-PAR-011", produitId: 1, quantite: 5, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-25"), statut: "Validé", agentResponsable: 411 }),
    new Transfert({ id: 12, reference: "TRF-PAR-012", produitId: 2, quantite: 10, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-27"), statut: "En attente", agentResponsable: 412 }),
    new Transfert({ id: 13, reference: "TRF-PAR-013", produitId: 3, quantite: 4, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-05-29"), statut: "Validé", agentResponsable: 413 }),
    new Transfert({ id: 14, reference: "TRF-PAR-014", produitId: 4, quantite: 6, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-05-31"), statut: "Refusé", motif: "Date péremption proche", agentResponsable: 414 }),
    new Transfert({ id: 15, reference: "TRF-PAR-015", produitId: 5, quantite: 12, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-02-02"), statut: "Validé", agentResponsable: 415 }),

    // Transferts depuis Magasin 2 (Lyon) - 15 transferts
    new Transfert({ id: 16, reference: "TRF-LYO-001", produitId: 11, quantite: 15, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-06"), statut: "Validé", agentResponsable: 416 }),
    new Transfert({ id: 17, reference: "TRF-LYO-002", produitId: 12, quantite: 10, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-08"), statut: "Validé", agentResponsable: 417 }),
    new Transfert({ id: 18, reference: "TRF-LYO-003", produitId: 13, quantite: 8, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-10"), statut: "En attente", agentResponsable: 418 }),
    new Transfert({ id: 19, reference: "TRF-LYO-004", produitId: 14, quantite: 12, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-12"), statut: "Refusé", motif: "Stock critique", agentResponsable: 419 }),
    new Transfert({ id: 20, reference: "TRF-LYO-005", produitId: 15, quantite: 20, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-14"), statut: "Validé", agentResponsable: 420 }),
    new Transfert({ id: 21, reference: "TRF-LYO-006", produitId: 16, quantite: 5, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-16"), statut: "Validé", agentResponsable: 421 }),
    new Transfert({ id: 22, reference: "TRF-LYO-007", produitId: 17, quantite: 3, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-18"), statut: "En attente", agentResponsable: 422 }),
    new Transfert({ id: 23, reference: "TRF-LYO-008", produitId: 18, quantite: 6, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-20"), statut: "Refusé", motif: "Emballage abîmé", agentResponsable: 423 }),
    new Transfert({ id: 24, reference: "TRF-LYO-009", produitId: 19, quantite: 10, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-22"), statut: "Validé", agentResponsable: 424 }),
    new Transfert({ id: 25, reference: "TRF-LYO-010", produitId: 20, quantite: 7, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-24"), statut: "Validé", agentResponsable: 425 }),
    new Transfert({ id: 26, reference: "TRF-LYO-011", produitId: 11, quantite: 8, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-26"), statut: "Validé", agentResponsable: 426 }),
    new Transfert({ id: 27, reference: "TRF-LYO-012", produitId: 12, quantite: 12, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-05-28"), statut: "En attente", agentResponsable: 427 }),
    new Transfert({ id: 28, reference: "TRF-LYO-013", produitId: 13, quantite: 5, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-05-30"), statut: "Validé", agentResponsable: 428 }),
    new Transfert({ id: 29, reference: "TRF-LYO-014", produitId: 14, quantite: 9, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-02-01"), statut: "Refusé", motif: "Produit périmé", agentResponsable: 429 }),
    new Transfert({ id: 30, reference: "TRF-LYO-015", produitId: 15, quantite: 15, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-02-03"), statut: "Validé", agentResponsable: 430 }),

    // Transferts depuis Magasin 3 (Marseille) - 15 transferts
    new Transfert({ id: 31, reference: "TRF-MAR-001", produitId: 21, quantite: 12, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-07"), statut: "Validé", agentResponsable: 431 }),
    new Transfert({ id: 32, reference: "TRF-MAR-002", produitId: 22, quantite: 8, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-09"), statut: "Validé", agentResponsable: 432 }),
    new Transfert({ id: 33, reference: "TRF-MAR-003", produitId: 23, quantite: 6, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-11"), statut: "En attente", agentResponsable: 433 }),
    new Transfert({ id: 34, reference: "TRF-MAR-004", produitId: 24, quantite: 4, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-13"), statut: "Refusé", motif: "Stock réservé", agentResponsable: 434 }),
    new Transfert({ id: 35, reference: "TRF-MAR-005", produitId: 25, quantite: 18, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-15"), statut: "Validé", agentResponsable: 435 }),
    new Transfert({ id: 36, reference: "TRF-MAR-006", produitId: 26, quantite: 3, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-17"), statut: "Validé", agentResponsable: 436 }),
    new Transfert({ id: 37, reference: "TRF-MAR-007", produitId: 27, quantite: 2, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-19"), statut: "En attente", agentResponsable: 437 }),
    new Transfert({ id: 38, reference: "TRF-MAR-008", produitId: 28, quantite: 10, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-21"), statut: "Refusé", motif: "Commande annulée", agentResponsable: 438 }),
    new Transfert({ id: 39, reference: "TRF-MAR-009", produitId: 29, quantite: 7, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-23"), statut: "Validé", agentResponsable: 439 }),
    new Transfert({ id: 40, reference: "TRF-MAR-010", produitId: 30, quantite: 5, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-25"), statut: "Validé", agentResponsable: 440 }),
    new Transfert({ id: 41, reference: "TRF-MAR-011", produitId: 21, quantite: 9, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-27"), statut: "Validé", agentResponsable: 441 }),
    new Transfert({ id: 42, reference: "TRF-MAR-012", produitId: 22, quantite: 6, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-05-29"), statut: "En attente", agentResponsable: 442 }),
    new Transfert({ id: 43, reference: "TRF-MAR-013", produitId: 23, quantite: 5, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-05-31"), statut: "Validé", agentResponsable: 443 }),
    new Transfert({ id: 44, reference: "TRF-MAR-014", produitId: 24, quantite: 3, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-02-02"), statut: "Refusé", motif: "Quantité insuffisante", agentResponsable: 444 }),
    new Transfert({ id: 45, reference: "TRF-MAR-015", produitId: 25, quantite: 12, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-02-04"), statut: "Validé", agentResponsable: 445 })
];
export const depenses: Depense[] = [
  // Magasin Paris (ID 1) - 10 dépenses
  new Depense({ id: 1, date: new Date("2025-05-02"), categoryId: 1, montant: 1200.00, type: "STOCK", description: "Achat pâtes Barilla", paymentMode: "Virement", magasinId: 1 }),
  new Depense({ id: 2, date: new Date("2025-05-03"), categoryId: 2, montant: 450.50, type: "STANDARD", description: "Entretien camion livraison", paymentMode: "Chèque", magasinId: 1 }),
  new Depense({ id: 7, date: new Date("2025-05-07"), categoryId: 2, montant: 150.00, type: "STANDARD", description: "Nettoyage magasin", paymentMode: "Espèces", magasinId: 1 }),
  new Depense({ id: 10, date: new Date("2025-05-10"), categoryId: 1, montant: 1650.00, type: "STOCK", description: "Achat fruits et légumes", paymentMode: "Virement", magasinId: 1 }),
  new Depense({ id: 13, date: new Date("2025-05-15"), categoryId: 3, montant: 850.00, type: "STOCK", description: "Achat produits surgelés", paymentMode: "Virement", magasinId: 1 }),
  new Depense({ id: 16, date: new Date("2025-05-18"), categoryId: 4, montant: 320.75, type: "STANDARD", description: "Matériel de caisse", paymentMode: "Carte", magasinId: 1 }),
  new Depense({ id: 19, date: new Date("2025-05-22"), categoryId: 5, montant: 280.00, type: "STANDARD", description: "Formation employés", paymentMode: "Chèque", magasinId: 1 }),
  new Depense({ id: 22, date: new Date("2025-05-25"), categoryId: 1, montant: 1350.00, type: "STOCK", description: "Achat produits bio", paymentMode: "Virement", magasinId: 1 }),
  new Depense({ id: 25, date: new Date("2025-05-28"), categoryId: 2, montant: 175.50, type: "STANDARD", description: "Réparation chariot", paymentMode: "Espèces", magasinId: 1 }),
  new Depense({ id: 28, date: new Date("2025-05-30"), categoryId: 3, montant: 920.00, type: "STOCK", description: "Achat produits secs", paymentMode: "Virement", magasinId: 1 }),

  // Magasin Lyon (ID 2) - 10 dépenses
  new Depense({ id: 3, date: new Date("2025-05-05"), categoryId: 3, montant: 3200.00, type: "STOCK", description: "Achat viandes", paymentMode: "Virement", magasinId: 2 }),
  new Depense({ id: 4, date: new Date("2025-05-08"), categoryId: 4, montant: 180.75, type: "STANDARD", description: "Fournitures bureau", paymentMode: "Carte", magasinId: 2 }),
  new Depense({ id: 8, date: new Date("2025-05-12"), categoryId: 3, montant: 2800.00, type: "STOCK", description: "Achat boissons", paymentMode: "Virement", magasinId: 2 }),
  new Depense({ id: 11, date: new Date("2025-05-13"), categoryId: 5, montant: 420.30, type: "STANDARD", description: "Publicité locale", paymentMode: "Chèque", magasinId: 2 }),
  new Depense({ id: 14, date: new Date("2025-05-16"), categoryId: 1, montant: 1100.00, type: "STOCK", description: "Achat épicerie", paymentMode: "Virement", magasinId: 2 }),
  new Depense({ id: 17, date: new Date("2025-05-19"), categoryId: 2, montant: 380.00, type: "STANDARD", description: "Carburant livraison", paymentMode: "Carte", magasinId: 2 }),
  new Depense({ id: 20, date: new Date("2025-05-23"), categoryId: 4, montant: 210.50, type: "STANDARD", description: "Logiciel caisse", paymentMode: "Virement", magasinId: 2 }),
  new Depense({ id: 23, date: new Date("2025-05-26"), categoryId: 3, montant: 1950.00, type: "STOCK", description: "Achat poissons", paymentMode: "Virement", magasinId: 2 }),
  new Depense({ id: 26, date: new Date("2025-05-29"), categoryId: 5, montant: 150.00, type: "STANDARD", description: "Fleurs accueil", paymentMode: "Espèces", magasinId: 2 }),
  new Depense({ id: 29, date: new Date("2025-05-31"), categoryId: 1, montant: 1250.00, type: "STOCK", description: "Achat produits boulangerie", paymentMode: "Virement", magasinId: 2 }),

  // Magasin Marseille (ID 3) - 10 dépenses
  new Depense({ id: 5, date: new Date("2025-05-10"), categoryId: 1, montant: 950.00, type: "STOCK", description: "Achat produits laitiers", paymentMode: "Virement", magasinId: 3 }),
  new Depense({ id: 6, date: new Date("2025-05-11"), categoryId: 5, montant: 420.30, type: "STANDARD", description: "Publicité locale", paymentMode: "Chèque", magasinId: 3 }),
  new Depense({ id: 9, date: new Date("2025-05-14"), categoryId: 4, montant: 75.60, type: "STANDARD", description: "Petit matériel", paymentMode: "Carte", magasinId: 3 }),
  new Depense({ id: 12, date: new Date("2025-05-15"), categoryId: 2, montant: 290.00, type: "STANDARD", description: "Uniforme personnel", paymentMode: "Chèque", magasinId: 3 }),
  new Depense({ id: 15, date: new Date("2025-05-17"), categoryId: 3, montant: 1800.00, type: "STOCK", description: "Achat charcuterie", paymentMode: "Virement", magasinId: 3 }),
  new Depense({ id: 18, date: new Date("2025-05-20"), categoryId: 1, montant: 1350.00, type: "STOCK", description: "Achat fruits exotiques", paymentMode: "Virement", magasinId: 3 }),
  new Depense({ id: 21, date: new Date("2025-05-24"), categoryId: 5, montant: 350.00, type: "STANDARD", description: "Décorations saisonnières", paymentMode: "Espèces", magasinId: 3 }),
  new Depense({ id: 24, date: new Date("2025-05-27"), categoryId: 4, montant: 120.00, type: "STANDARD", description: "Abonnements logiciels", paymentMode: "Virement", magasinId: 3 }),
  new Depense({ id: 27, date: new Date("2025-05-30"), categoryId: 2, montant: 410.00, type: "STANDARD", description: "Maintenance équipement", paymentMode: "Carte", magasinId: 3 }),
  new Depense({ id: 30, date: new Date("2025-02-01"), categoryId: 3, montant: 2200.00, type: "STOCK", description: "Achat vins et spiritueux", paymentMode: "Virement", magasinId: 3 })
];

export const recettes: Recette[] = [
  // Magasin Paris (ID 1) - 10 recettes
  new Recette({ id: 1, date: new Date("2025-05-02"), categoryId: 101, montant: 3500.75, description: "Vente produits alimentaires", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 4, date: new Date("2025-05-05"), categoryId: 101, montant: 4200.00, description: "Vente weekend produits alimentaires", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 7, date: new Date("2025-05-09"), categoryId: 102, montant: 3800.25, description: "Vente promotion printemps", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 10, date: new Date("2025-05-12"), categoryId: 102, montant: 3650.50, description: "Promotion spéciale clients fidèles", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 13, date: new Date("2025-05-16"), categoryId: 103, montant: 4100.00, description: "Soirée gastronomique", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 16, date: new Date("2025-05-19"), categoryId: 101, montant: 3200.75, description: "Vente quotidienne alimentaire", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 19, date: new Date("2025-05-23"), categoryId: 103, montant: 2850.50, description: "Événement vin fromage", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 22, date: new Date("2025-05-26"), categoryId: 105, montant: 3950.00, description: "Service traiteur entreprise", paymentMode: "Virement", magasinId: 1 }),
  new Recette({ id: 25, date: new Date("2025-05-29"), categoryId: 101, montant: 2750.25, description: "Vente produits bio", paymentMode: "Mixte", magasinId: 1 }),
  new Recette({ id: 28, date: new Date("2025-05-04"), categoryId: 104, montant: 4300.00, description: "Subvention mairie Paris", paymentMode: "Virement", magasinId: 1 }),

  // Magasin Lyon (ID 2) - 10 recettes
  new Recette({ id: 2, date: new Date("2025-05-03"), categoryId: 101, montant: 2800.50, description: "Vente produits régionaux", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 5, date: new Date("2025-05-06"), categoryId: 102, montant: 3100.75, description: "Promotion produits lyonnais", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 8, date: new Date("2025-05-10"), categoryId: 101, montant: 2950.00, description: "Vente charcuterie", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 11, date: new Date("2025-05-14"), categoryId: 102, montant: 3400.50, description: "Promotion vins", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 14, date: new Date("2025-05-17"), categoryId: 103, montant: 2650.00, description: "Dégustation vins", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 17, date: new Date("2025-05-20"), categoryId: 105, montant: 3050.75, description: "Service livraison entreprises", paymentMode: "Virement", magasinId: 2 }),
  new Recette({ id: 20, date: new Date("2025-05-24"), categoryId: 101, montant: 3750.00, description: "Vente primeurs", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 23, date: new Date("2025-05-27"), categoryId: 103, montant: 2900.50, description: "Atelier cuisine", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 26, date: new Date("2025-05-30"), categoryId: 101, montant: 2450.25, description: "Vente fromagerie", paymentMode: "Mixte", magasinId: 2 }),
  new Recette({ id: 29, date: new Date("2025-05-05"), categoryId: 104, montant: 3300.00, description: "Aide région Rhône-Alpes", paymentMode: "Virement", magasinId: 2 }),

  // Magasin Marseille (ID 3) - 10 recettes
  new Recette({ id: 3, date: new Date("2025-05-04"), categoryId: 101, montant: 1950.25, description: "Vente produits méditerranéens", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 6, date: new Date("2025-05-07"), categoryId: 102, montant: 2450.50, description: "Promotion poissons", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 9, date: new Date("2025-05-11"), categoryId: 103, montant: 2100.75, description: "Soirée tapas", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 12, date: new Date("2025-05-15"), categoryId: 102, montant: 2300.00, description: "Promotion huiles d'olive", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 15, date: new Date("2025-05-18"), categoryId: 101, montant: 1850.50, description: "Vente épicerie fine", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 18, date: new Date("2025-05-21"), categoryId: 105, montant: 2000.75, description: "Service plateau-repas", paymentMode: "Carte", magasinId: 3 }),
  new Recette({ id: 21, date: new Date("2025-05-25"), categoryId: 103, montant: 2550.00, description: "Animation produits locaux", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 24, date: new Date("2025-05-28"), categoryId: 101, montant: 1900.50, description: "Vente produits bio", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 27, date: new Date("2025-05-31"), categoryId: 102, montant: 1750.25, description: "Promotion de fin mois", paymentMode: "Mixte", magasinId: 3 }),
  new Recette({ id: 30, date: new Date("2025-05-03"), categoryId: 104, montant: 2250.00, description: "Subvention ville Marseille", paymentMode: "Virement", magasinId: 3 })
];

export const categories: Categorie[] = [
  // Catégories de Dépenses (type: 'DEPENSE')
  new Categorie({
      id: 1,
      name: "Achat Stock Alimentaire",
      description: "Achats de produits pour revente (nourriture, boissons)",
      type: 'DEPENSE',
      isActive: true
  }),
  new Categorie({
      id: 2,
      name: "Frais Logistiques",
      description: "Transport, maintenance et fonctionnement du magasin",
      type: 'DEPENSE',
      isActive: true
  }),
  new Categorie({
      id: 3,
      name: "Achat Produits Frais",
      description: "Viandes, poissons, produits laitiers et frais",
      type: 'DEPENSE',
      isActive: true
  }),
  new Categorie({
      id: 4,
      name: "Fournitures Bureau",
      description: "Matériel administratif et de caisse",
      type: 'DEPENSE',
      isActive: true
  }),
  new Categorie({
      id: 5,
      name: "Marketing & Communication",
      description: "Publicité, promotions et décorations",
      type: 'DEPENSE',
      isActive: true
  }),
  new Categorie({
      id: 6,
      name: "Frais Généraux",
      description: "Divers frais de fonctionnement",
      type: 'DEPENSE',
      isActive: true
  }),

  // Catégories de Recettes (type: 'RECETTE')
  new Categorie({
      id: 101,
      name: "Ventes Alimentaires",
      description: "Recettes des ventes de produits alimentaires",
      type: 'RECETTE',
      isActive: true
  }),
  new Categorie({
      id: 102,
      name: "Ventes Promotions",
      description: "Recettes issues des opérations promotionnelles",
      type: 'RECETTE',
      isActive: true
  }),
  new Categorie({
      id: 103,
      name: "Ventes Événementielles",
      description: "Recettes spéciales (soirées, événements)",
      type: 'RECETTE',
      isActive: true
  }),
  new Categorie({
      id: 104,
      name: "Subventions",
      description: "Aides et subventions exceptionnelles",
      type: 'RECETTE',
      isActive: false
  }),
  new Categorie({
      id: 105,
      name: "Services Annexes",
      description: "Recettes des services complémentaires",
      type: 'RECETTE',
      isActive: true
  })
];
  // Clients (5 par magasin)
export const clients: Client[] = [
  // Clients pour Magasin 1 (Paris)
  new Client({
    id: 1,
    nomComplet: "Jean Dupont",
    email: "jean.dupont@email.com",
    telephone: "0612345678",
    adresse: "10 Rue de Paris, 75001 Paris",
    dateCreation: new Date("2023-01-10"),
    solde: 1500,
    estEmploye: false,
  }),
  new Client({
    id: 2,
    nomComplet: "Marie Martin",
    email: "marie.martin@email.com",
    telephone: "0623456789",
    adresse: "22 Avenue des Champs, 75008 Paris",
    dateCreation: new Date("2023-02-15"),
    solde: 750,
    estEmploye: false,
  }),
  new Client({
    id: 3,
    nomComplet: "Pierre Durand",
    email: "pierre.durand@email.com",
    telephone: "0634567890",
    adresse: "5 Boulevard Saint-Germain, 75005 Paris",
    dateCreation: new Date("2023-03-20"),
    solde: 2000,
    estEmploye: true,
  }),
  new Client({
    id: 4,
    nomComplet: "Sophie Lambert",
    email: "sophie.lambert@email.com",
    telephone: "0645678901",
    adresse: "15 Rue de Rivoli, 75004 Paris",
    dateCreation: new Date("2023-04-05"),
    solde: 500,
    estEmploye: false,
  }),
  new Client({
    id: 5,
    nomComplet: "Thomas Moreau",
    email: "thomas.moreau@email.com",
    telephone: "0656789012",
    adresse: "30 Rue de la Paix, 75002 Paris",
    dateCreation: new Date("2023-05-12"),
    solde: 1200,
    estEmploye: false,
  }),

  // Clients pour Magasin 2 (Lyon)
  new Client({
    id: 6,
    nomComplet: "Lucie Bernard",
    email: "lucie.bernard@email.com",
    telephone: "0678901234",
    adresse: "8 Rue de la République, 69001 Lyon",
    dateCreation: new Date("2023-01-15"),
    solde: 1800,
    estEmploye: false,
  }),
  new Client({
    id: 7,
    nomComplet: "Antoine Petit",
    email: "antoine.petit@email.com",
    telephone: "0689012345",
    adresse: "12 Rue Victor Hugo, 69002 Lyon",
    dateCreation: new Date("2023-02-20"),
    solde: 950,
    estEmploye: false,
  }),
  new Client({
    id: 8,
    nomComplet: "Elodie Roux",
    email: "elodie.roux@email.com",
    telephone: "0690123456",
    adresse: "4 Place Bellecour, 69002 Lyon",
    dateCreation: new Date("2023-03-25"),
    solde: 600,
    estEmploye: true,
  }),
  new Client({
    id: 9,
    nomComplet: "Nicolas Leroy",
    email: "nicolas.leroy@email.com",
    telephone: "0612340987",
    adresse: "18 Rue de la Charité, 69007 Lyon",
    dateCreation: new Date("2023-04-10"),
    solde: 2200,
    estEmploye: false,
  }),
  new Client({
    id: 10,
    nomComplet: "Camille Fournier",
    email: "camille.fournier@email.com",
    telephone: "0623459876",
    adresse: "7 Quai Saint-Antoine, 69002 Lyon",
    dateCreation: new Date("2023-05-15"),
    solde: 850,
    estEmploye: false,
  }),

  // Clients pour Magasin 3 (Marseille)
  new Client({
    id: 11,
    nomComplet: "Alexandre Michel",
    email: "alexandre.michel@email.com",
    telephone: "0634568765",
    adresse: "25 Rue Paradis, 13006 Marseille",
    dateCreation: new Date("2023-01-20"),
    solde: 1700,
    estEmploye: false,
  }),
  new Client({
    id: 12,
    nomComplet: "Julie Laurent",
    email: "julie.laurent@email.com",
    telephone: "0645677654",
    adresse: "10 Rue Saint-Ferréol, 13001 Marseille",
    dateCreation: new Date("2023-02-25"),
    solde: 1100,
    estEmploye: false,
  }),
  new Client({
    id: 13,
    nomComplet: "Maxime Simon",
    email: "maxime.simon@email.com",
    telephone: "0656786543",
    adresse: "3 Cours Belsunce, 13001 Marseille",
    dateCreation: new Date("2023-03-30"),
    solde: 650,
    estEmploye: true,
  }),
  new Client({
    id: 14,
    nomComplet: "Laura Lefebvre",
    email: "laura.lefebvre@email.com",
    telephone: "0667895432",
    adresse: "15 Rue de Rome, 13006 Marseille",
    dateCreation: new Date("2023-04-15"),
    solde: 1900,
    estEmploye: false,
  }),
  new Client({
    id: 15,
    nomComplet: "Hugo Martinez",
    email: "hugo.martinez@email.com",
    telephone: "0678904321",
    adresse: "8 Boulevard Longchamp, 13001 Marseille",
    dateCreation: new Date("2023-05-20"),
    solde: 800,
    estEmploye: false,
  })
];

// Vendeurs (1-2 par magasin)
export const vendeurs: User[] = [
  // Vendeurs pour Magasin 1 (Paris)
  new User({
    id: 101,
    nom: "Sophie Garnier",
    telephone: "0611223344",
    email: "sophie.garnier@supermarket.com",
    password: "password123",
    typeUser: "Employé",
    status: true,
    role: "CAISSIER",
    adresse: "5 Rue de Paris, 75001 Paris",
    poste: "Caissier",
    dateCreation: new Date("2022-02-01"),
    salaire: 1800,
    typeContrat: "CDI",
  }),
  new User({
    id: 102,
    nom: "Thomas Leroux",
    telephone: "0622334455",
    email: "thomas.leroux@supermarket.com",
    password: "password123",
    typeUser: "Employé",
    status: true,
    role: "VENDEUR",
    adresse: "12 Avenue de Clichy, 75017 Paris",
    poste: "Vendeur",
    dateCreation: new Date("2022-02-15"),
    salaire: 2000,
    typeContrat: "CDI",
  }),

  // Vendeurs pour Magasin 2 (Lyon)
  new User({
    id: 103,
    nom: "Laura Dumont",
    telephone: "0633445566",
    email: "laura.dumont@supermarket.com",
    password: "password123",
    typeUser: "Employé",
    status: true,
    role: "CAISSIER",
    adresse: "8 Rue de Lyon, 69001 Lyon",
    poste: "Caissier",
    dateCreation: new Date("2022-03-10"),
    salaire: 1750,
    typeContrat: "CDI",
  }),

  // Vendeurs pour Magasin 3 (Marseille)
  new User({
    id: 104,
    nom: "Julien Morel",
    telephone: "0644556677",
    email: "julien.morel@supermarket.com",
    password: "password123",
    typeUser: "Employé",
    status: true,
    role: "CAISSIER",
    adresse: "10 Rue de Marseille, 13001 Marseille",
    poste: "Caissier",
    dateCreation: new Date("2022-05-15"),
    salaire: 1700,
    typeContrat: "CDD",
  }),
  new User({
    id: 105,
    nom: "Amélie Petit",
    telephone: "0655667788",
    email: "amelie.petit@supermarket.com",
    password: "password123",
    typeUser: "Employé",
    status: true,
    role: "VENDEUR",
    adresse: "15 Boulevard National, 13001 Marseille",
    poste: "Vendeur",
    dateCreation: new Date("2022-05-20"),
    salaire: 1850,
    typeContrat: "CDI",
  })
];

// Modes de paiement
export const modesPaiement: ModePaiement[] = [
  new ModePaiement({ id: 1, libelle: 'Espèce' }),
  new ModePaiement({ id: 2, libelle: 'Carte' }),
  new ModePaiement({ id: 3, libelle: 'Mobile Money' }),
  new ModePaiement({ id: 4, libelle: 'Virement' })
];

// Paniers (10 par magasin)
export const paniers: Panier[] = [
  // Paniers pour Magasin 1 (Paris)
  new Panier({
    id: 1,
    clientId: 1,
    magasinId: 1,
    agentId: 101,
    dateCreation: new Date("2025-05-01T10:15:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[0],
        quantite: 2,
        prixVenteUnitaire: produits[0].prixVenteUnitaire,
        prixAchatUnitaire: produits[0].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[0].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[2],
        quantite: 1,
        prixVenteUnitaire: produits[2].prixVenteUnitaire,
        prixAchatUnitaire: produits[2].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[2].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[4],
        quantite: 3,
        prixVenteUnitaire: produits[4].prixVenteUnitaire,
        prixAchatUnitaire: produits[4].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[4].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 1,
        montant: 6.50,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-01T10:20:00"),
        panierId: 1,
        clientId: 1,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 2,
    clientId: 2,
    magasinId: 1,
    agentId: 102,
    dateCreation: new Date("2025-05-02T11:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[1],
        quantite: 5,
        prixVenteUnitaire: produits[1].prixVenteUnitaire,
        prixAchatUnitaire: produits[1].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[1].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[3],
        quantite: 2,
        prixVenteUnitaire: produits[3].prixVenteUnitaire,
        prixAchatUnitaire: produits[3].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[3].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 2,
        montant: 2.30,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-02T11:35:00"),
        panierId: 2,
        clientId: 2,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 3,
    clientId: 3,
    magasinId: 1,
    agentId: 101,
    dateCreation: new Date("2025-05-03T14:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[5],
        quantite: 1,
        prixVenteUnitaire: produits[5].prixVenteUnitaire,
        prixAchatUnitaire: produits[5].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[5].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[7],
        quantite: 1,
        prixVenteUnitaire: produits[7].prixVenteUnitaire,
        prixAchatUnitaire: produits[7].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[7].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 3,
        montant: 21.50,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-03T14:50:00"),
        panierId: 3,
        clientId: 3,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 4,
    clientId: 4,
    magasinId: 1,
    agentId: 102,
    dateCreation: new Date("2025-05-04T16:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[6],
        quantite: 1,
        prixVenteUnitaire: produits[6].prixVenteUnitaire,
        prixAchatUnitaire: produits[6].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[6].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 4,
        montant: 39.99,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-04T16:25:00"),
        panierId: 4,
        clientId: 4,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 5,
    clientId: 5,
    magasinId: 1,
    agentId: 101,
    dateCreation: new Date("2025-05-05T09:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[8],
        quantite: 1,
        prixVenteUnitaire: produits[8].prixVenteUnitaire,
        prixAchatUnitaire: produits[8].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[8].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[9],
        quantite: 2,
        prixVenteUnitaire: produits[9].prixVenteUnitaire,
        prixAchatUnitaire: produits[9].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[9].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 5,
        montant: 6.70,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-05T09:15:00"),
        panierId: 5,
        clientId: 5,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 6,
    clientId: 1,
    magasinId: 1,
    agentId: 102,
    dateCreation: new Date("2025-05-06T17:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[0],
        quantite: 1,
        prixVenteUnitaire: produits[0].prixVenteUnitaire,
        prixAchatUnitaire: produits[0].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[0].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[1],
        quantite: 3,
        prixVenteUnitaire: produits[1].prixVenteUnitaire,
        prixAchatUnitaire: produits[1].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[1].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[3],
        quantite: 1,
        prixVenteUnitaire: produits[3].prixVenteUnitaire,
        prixAchatUnitaire: produits[3].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[3].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 6,
        montant: 4.80,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-06T17:35:00"),
        panierId: 6,
        clientId: 1,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 7,
    clientId: 2,
    magasinId: 1,
    agentId: 101,
    dateCreation: new Date("2025-05-07T12:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[2],
        quantite: 2,
        prixVenteUnitaire: produits[2].prixVenteUnitaire,
        prixAchatUnitaire: produits[2].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[2].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[4],
        quantite: 1,
        prixVenteUnitaire: produits[4].prixVenteUnitaire,
        prixAchatUnitaire: produits[4].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[4].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[6],
        quantite: 1,
        prixVenteUnitaire: produits[6].prixVenteUnitaire,
        prixAchatUnitaire: produits[6].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[6].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 7,
        montant: 43.99,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-07T12:50:00"),
        panierId: 7,
        clientId: 2,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 8,
    clientId: 3,
    magasinId: 1,
    agentId: 102,
    dateCreation: new Date("2025-05-08T15:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[5],
        quantite: 1,
        prixVenteUnitaire: produits[5].prixVenteUnitaire,
        prixAchatUnitaire: produits[5].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[5].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[7],
        quantite: 1,
        prixVenteUnitaire: produits[7].prixVenteUnitaire,
        prixAchatUnitaire: produits[7].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[7].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[9],
        quantite: 3,
        prixVenteUnitaire: produits[9].prixVenteUnitaire,
        prixAchatUnitaire: produits[9].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[9].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 8,
        montant: 23.70,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-08T15:25:00"),
        panierId: 8,
        clientId: 3,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 9,
    clientId: 4,
    magasinId: 1,
    agentId: 101,
    dateCreation: new Date("2025-05-09T11:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[8],
        quantite: 1,
        prixVenteUnitaire: produits[8].prixVenteUnitaire,
        prixAchatUnitaire: produits[8].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[8].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 9,
        montant: 4.50,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-09T11:15:00"),
        panierId: 9,
        clientId: 4,
        magasinId: 1
      })
    ]
  }),
  new Panier({
    id: 10,
    clientId: 5,
    magasinId: 1,
    agentId: 102,
    dateCreation: new Date("2025-05-10T18:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[0],
        quantite: 1,
        prixVenteUnitaire: produits[0].prixVenteUnitaire,
        prixAchatUnitaire: produits[0].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[0].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[2],
        quantite: 2,
        prixVenteUnitaire: produits[2].prixVenteUnitaire,
        prixAchatUnitaire: produits[2].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[2].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[4],
        quantite: 2,
        prixVenteUnitaire: produits[4].prixVenteUnitaire,
        prixAchatUnitaire: produits[4].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[4].id && s.magasinId === 1)
      }),
      new ArticlePanier({
        produit: produits[6],
        quantite: 1,
        prixVenteUnitaire: produits[6].prixVenteUnitaire,
        prixAchatUnitaire: produits[6].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[6].id && s.magasinId === 1)
      })
    ],
    paiements: [
      new Paiement({
        id: 10,
        montant: 46.49,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-10T18:35:00"),
        panierId: 10,
        clientId: 5,
        magasinId: 1
      })
    ]
  }),

  // Paniers pour Magasin 2 (Lyon)
  new Panier({
    id: 11,
    clientId: 6,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-01T09:15:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[10],
        quantite: 1,
        prixVenteUnitaire: produits[10].prixVenteUnitaire,
        prixAchatUnitaire: produits[10].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[10].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[12],
        quantite: 2,
        prixVenteUnitaire: produits[12].prixVenteUnitaire,
        prixAchatUnitaire: produits[12].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[12].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 11,
        montant: 5.50,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-01T09:20:00"),
        panierId: 11,
        clientId: 6,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 12,
    clientId: 7,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-02T10:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[11],
        quantite: 1,
        prixVenteUnitaire: produits[11].prixVenteUnitaire,
        prixAchatUnitaire: produits[11].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[11].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[13],
        quantite: 4,
        prixVenteUnitaire: produits[13].prixVenteUnitaire,
        prixAchatUnitaire: produits[13].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[13].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 12,
        montant: 3.30,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-02T10:35:00"),
        panierId: 12,
        clientId: 7,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 13,
    clientId: 8,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-03T13:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[14],
        quantite: 3,
        prixVenteUnitaire: produits[14].prixVenteUnitaire,
        prixAchatUnitaire: produits[14].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[14].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[16],
        quantite: 1,
        prixVenteUnitaire: produits[16].prixVenteUnitaire,
        prixAchatUnitaire: produits[16].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[16].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 13,
        montant: 10.80,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-03T13:50:00"),
        panierId: 13,
        clientId: 8,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 14,
    clientId: 9,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-04T15:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[15],
        quantite: 1,
        prixVenteUnitaire: produits[15].prixVenteUnitaire,
        prixAchatUnitaire: produits[15].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[15].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 14,
        montant: 29.99,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-04T15:25:00"),
        panierId: 14,
        clientId: 9,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 15,
    clientId: 10,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-05T08:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[17],
        quantite: 1,
        prixVenteUnitaire: produits[17].prixVenteUnitaire,
        prixAchatUnitaire: produits[17].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[17].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[19],
        quantite: 2,
        prixVenteUnitaire: produits[19].prixVenteUnitaire,
        prixAchatUnitaire: produits[19].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[19].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 15,
        montant: 10.70,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-05T08:15:00"),
        panierId: 15,
        clientId: 10,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 16,
    clientId: 6,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-06T16:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[10],
        quantite: 1,
        prixVenteUnitaire: produits[10].prixVenteUnitaire,
        prixAchatUnitaire: produits[10].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[10].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[12],
        quantite: 1,
        prixVenteUnitaire: produits[12].prixVenteUnitaire,
        prixAchatUnitaire: produits[12].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[12].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[14],
        quantite: 2,
        prixVenteUnitaire: produits[14].prixVenteUnitaire,
        prixAchatUnitaire: produits[14].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[14].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 16,
        montant: 7.00,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-06T16:35:00"),
        panierId: 16,
        clientId: 6,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 17,
    clientId: 7,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-07T11:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[11],
        quantite: 2,
        prixVenteUnitaire: produits[11].prixVenteUnitaire,
        prixAchatUnitaire: produits[11].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[11].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[13],
        quantite: 6,
        prixVenteUnitaire: produits[13].prixVenteUnitaire,
        prixAchatUnitaire: produits[13].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[13].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[15],
        quantite: 1,
        prixVenteUnitaire: produits[15].prixVenteUnitaire,
        prixAchatUnitaire: produits[15].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[15].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 17,
        montant: 33.29,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-07T11:50:00"),
        panierId: 17,
        clientId: 7,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 18,
    clientId: 8,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-08T14:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[16],
        quantite: 1,
        prixVenteUnitaire: produits[16].prixVenteUnitaire,
        prixAchatUnitaire: produits[16].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[16].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[18],
        quantite: 2,
        prixVenteUnitaire: produits[18].prixVenteUnitaire,
        prixAchatUnitaire: produits[18].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[18].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 18,
        montant: 15.10,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-08T14:25:00"),
        panierId: 18,
        clientId: 8,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 19,
    clientId: 9,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-09T10:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[17],
        quantite: 1,
        prixVenteUnitaire: produits[17].prixVenteUnitaire,
        prixAchatUnitaire: produits[17].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[17].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 19,
        montant: 6.20,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-09T10:15:00"),
        panierId: 19,
        clientId: 9,
        magasinId: 2
      })
    ]
  }),
  new Panier({
    id: 20,
    clientId: 10,
    magasinId: 2,
    agentId: 103,
    dateCreation: new Date("2025-05-10T17:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[10],
        quantite: 2,
        prixVenteUnitaire: produits[10].prixVenteUnitaire,
        prixAchatUnitaire: produits[10].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[10].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[12],
        quantite: 3,
        prixVenteUnitaire: produits[12].prixVenteUnitaire,
        prixAchatUnitaire: produits[12].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[12].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[14],
        quantite: 1,
        prixVenteUnitaire: produits[14].prixVenteUnitaire,
        prixAchatUnitaire: produits[14].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[14].id && s.magasinId === 2)
      }),
      new ArticlePanier({
        produit: produits[16],
        quantite: 1,
        prixVenteUnitaire: produits[16].prixVenteUnitaire,
        prixAchatUnitaire: produits[16].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[16].id && s.magasinId === 2)
      })
    ],
    paiements: [
      new Paiement({
        id: 20,
        montant: 18.20,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-10T17:35:00"),
        panierId: 20,
        clientId: 10,
        magasinId: 2
      })
    ]
  }),

  // Paniers pour Magasin 3 (Marseille)
  new Panier({
    id: 21,
    clientId: 11,
    magasinId: 3,
    agentId: 104,
    dateCreation: new Date("2025-05-01T08:15:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[20],
        quantite: 2,
        prixVenteUnitaire: produits[20].prixVenteUnitaire,
        prixAchatUnitaire: produits[20].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[20].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[22],
        quantite: 1,
        prixVenteUnitaire: produits[22].prixVenteUnitaire,
        prixAchatUnitaire: produits[22].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[22].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 21,
        montant: 4.70,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-01T08:20:00"),
        panierId: 21,
        clientId: 11,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 22,
    clientId: 12,
    magasinId: 3,
    agentId: 105,
    dateCreation: new Date("2025-05-02T09:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[21],
        quantite: 5,
        prixVenteUnitaire: produits[21].prixVenteUnitaire,
        prixAchatUnitaire: produits[21].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[21].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[23],
        quantite: 1,
        prixVenteUnitaire: produits[23].prixVenteUnitaire,
        prixAchatUnitaire: produits[23].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[23].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 22,
        montant: 13.90,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-02T09:35:00"),
        panierId: 22,
        clientId: 12,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 23,
    clientId: 13,
    magasinId: 3,
    agentId: 104,
    dateCreation: new Date("2025-05-03T12:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[24],
        quantite: 3,
        prixVenteUnitaire: produits[24].prixVenteUnitaire,
        prixAchatUnitaire: produits[24].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[24].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[26],
        quantite: 1,
        prixVenteUnitaire: produits[26].prixVenteUnitaire,
        prixAchatUnitaire: produits[26].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[26].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 23,
        montant: 19.50,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-03T12:50:00"),
        panierId: 23,
        clientId: 13,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 24,
    clientId: 14,
    magasinId: 3,
    agentId: 105,
    dateCreation: new Date("2025-05-04T14:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[25],
        quantite: 1,
        prixVenteUnitaire: produits[25].prixVenteUnitaire,
        prixAchatUnitaire: produits[25].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[25].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 24,
        montant: 24.99,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-04T14:25:00"),
        panierId: 24,
        clientId: 14,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 25,
    clientId: 15,
    magasinId: 3,
    agentId: 104,
    dateCreation: new Date("2025-05-05T07:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[27],
        quantite: 1,
        prixVenteUnitaire: produits[27].prixVenteUnitaire,
        prixAchatUnitaire: produits[27].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[27].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[29],
        quantite: 2,
        prixVenteUnitaire: produits[29].prixVenteUnitaire,
        prixAchatUnitaire: produits[29].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[29].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 25,
        montant: 5.50,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-05T07:15:00"),
        panierId: 25,
        clientId: 15,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 26,
    clientId: 11,
    magasinId: 3,
    agentId: 105,
    dateCreation: new Date("2025-05-06T15:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[20],
        quantite: 1,
        prixVenteUnitaire: produits[20].prixVenteUnitaire,
        prixAchatUnitaire: produits[20].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[20].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[22],
        quantite: 2,
        prixVenteUnitaire: produits[22].prixVenteUnitaire,
        prixAchatUnitaire: produits[22].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[22].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[24],
        quantite: 1,
        prixVenteUnitaire: produits[24].prixVenteUnitaire,
        prixAchatUnitaire: produits[24].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[24].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 26,
        montant: 5.70,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-06T15:35:00"),
        panierId: 26,
        clientId: 11,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 27,
    clientId: 12,
    magasinId: 3,
    agentId: 104,
    dateCreation: new Date("2025-05-07T10:45:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[21],
        quantite: 2,
        prixVenteUnitaire: produits[21].prixVenteUnitaire,
        prixAchatUnitaire: produits[21].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[21].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[23],
        quantite: 1,
        prixVenteUnitaire: produits[23].prixVenteUnitaire,
        prixAchatUnitaire: produits[23].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[23].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[25],
        quantite: 1,
        prixVenteUnitaire: produits[25].prixVenteUnitaire,
        prixAchatUnitaire: produits[25].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[25].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 27,
        montant: 38.89,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-07T10:50:00"),
        panierId: 27,
        clientId: 12,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 28,
    clientId: 13,
    magasinId: 3,
    agentId: 105,
    dateCreation: new Date("2025-05-08T13:20:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[26],
        quantite: 1,
        prixVenteUnitaire: produits[26].prixVenteUnitaire,
        prixAchatUnitaire: produits[26].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[26].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[28],
        quantite: 3,
        prixVenteUnitaire: produits[28].prixVenteUnitaire,
        prixAchatUnitaire: produits[28].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[28].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 28,
        montant: 23.30,
        methodePaiement: 1, // Espèce
        date: new Date("2025-05-08T13:25:00"),
        panierId: 28,
        clientId: 13,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 29,
    clientId: 14,
    magasinId: 3,
    agentId: 104,
    dateCreation: new Date("2025-05-09T09:10:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[27],
        quantite: 1,
        prixVenteUnitaire: produits[27].prixVenteUnitaire,
        prixAchatUnitaire: produits[27].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[27].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 29,
        montant: 4.00,
        methodePaiement: 2, // Carte
        date: new Date("2025-05-09T09:15:00"),
        panierId: 29,
        clientId: 14,
        magasinId: 3
      })
    ]
  }),
  new Panier({
    id: 30,
    clientId: 15,
    magasinId: 3,
    agentId: 105,
    dateCreation: new Date("2025-05-10T16:30:00"),
    statut: 'VALIDE',
    articles: [
      new ArticlePanier({
        produit: produits[20],
        quantite: 2,
        prixVenteUnitaire: produits[20].prixVenteUnitaire,
        prixAchatUnitaire: produits[20].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[20].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[22],
        quantite: 1,
        prixVenteUnitaire: produits[22].prixVenteUnitaire,
        prixAchatUnitaire: produits[22].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[22].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[24],
        quantite: 2,
        prixVenteUnitaire: produits[24].prixVenteUnitaire,
        prixAchatUnitaire: produits[24].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[24].id && s.magasinId === 3)
      }),
      new ArticlePanier({
        produit: produits[26],
        quantite: 1,
        prixVenteUnitaire: produits[26].prixVenteUnitaire,
        prixAchatUnitaire: produits[26].prixAchatUnitaire,
        stock: stocks.find(s => s.produitId === produits[26].id && s.magasinId === 3)
      })
    ],
    paiements: [
      new Paiement({
        id: 30,
        montant: 24.20,
        methodePaiement: 3, // Mobile Money
        date: new Date("2025-05-10T16:35:00"),
        panierId: 30,
        clientId: 15,
        magasinId: 3
      })
    ]
  })
];
// Extraire tous les paiements des paniers
export const paiements: Paiement[] = paniers.flatMap(p => p.paiements || []);