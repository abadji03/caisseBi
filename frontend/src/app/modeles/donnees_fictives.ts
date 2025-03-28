import { MouvementsStock, Stock } from "./entrees-sorties.model";
import { Depense, Recette } from "./finance.model";
import { Magasin } from "./magasin.model";
import { Panier } from "./panier.model";
import { Produits } from "./produit.modele";
import { Transfert } from "./transfert.model";

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
      dateDerniereMiseAJour: new Date("2025-03-15")
    }),
    new Stock({
      id: 2, produitId: 2, magasinId: 1, quantiteTotale: 300,
      quantiteReservee: 50, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.30, prixVenteUnitaire: 0.80, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-16")
    }),
    new Stock({
      id: 3, produitId: 3, magasinId: 1, quantiteTotale: 80,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.50, prixVenteUnitaire: 2.80, datePeremption: new Date("2025-11-20"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-14")
    }),
    new Stock({
      id: 4, produitId: 4, magasinId: 1, quantiteTotale: 120,
      quantiteReservee: 30, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.50, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-17")
    }),
    new Stock({
      id: 5, produitId: 5, magasinId: 1, quantiteTotale: 200,
      quantiteReservee: 40, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 0.60, prixVenteUnitaire: 1.20, datePeremption: new Date("2025-03-25"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-18")
    }),
    new Stock({
      id: 6, produitId: 6, magasinId: 1, quantiteTotale: 50,
      quantiteReservee: 10, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 8.50, prixVenteUnitaire: 12.00, datePeremption: new Date("2025-11-10"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-19")
    }),
    new Stock({
      id: 7, produitId: 7, magasinId: 1, quantiteTotale: 25,
      quantiteReservee: 5, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 25.00, prixVenteUnitaire: 39.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-20")
    }),
    new Stock({
      id: 8, produitId: 8, magasinId: 1, quantiteTotale: 60,
      quantiteReservee: 12, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 5.80, prixVenteUnitaire: 9.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-21")
    }),
    new Stock({
      id: 9, produitId: 9, magasinId: 1, quantiteTotale: 75,
      quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 2.30, prixVenteUnitaire: 4.50, datePeremption: new Date("2024-02-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-22")
    }),
    new Stock({
      id: 10, produitId: 10, magasinId: 1, quantiteTotale: 180,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 1.10, prixVenteUnitaire: 2.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-23")
    }),

    // Magasin 2 (Lyon) - Stocks pour produits 11-20
    new Stock({
      id: 11, produitId: 11, magasinId: 2, quantiteTotale: 120,
      quantiteReservee: 25, seuilAlerte: 10, seuilReapprovisionnement: 20,
      dernierPrixAchat: 1.80, prixVenteUnitaire: 3.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-15")
    }),
    new Stock({
      id: 12, produitId: 12, magasinId: 2, quantiteTotale: 150,
      quantiteReservee: 30, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 1.20, prixVenteUnitaire: 2.50, datePeremption: new Date("2025-11-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-16")
    }),
    new Stock({
      id: 13, produitId: 13, magasinId: 2, quantiteTotale: 90,
      quantiteReservee: 20, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.20, prixVenteUnitaire: 2.30, datePeremption: new Date("2025-11-01"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-17")
    }),
    new Stock({
      id: 14, produitId: 14, magasinId: 2, quantiteTotale: 200,
      quantiteReservee: 40, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.40, prixVenteUnitaire: 0.80, datePeremption: new Date("2025-11-10"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-18")
    }),
    new Stock({
      id: 15, produitId: 15, magasinId: 2, quantiteTotale: 180,
      quantiteReservee: 50, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.35, prixVenteUnitaire: 0.90, datePeremption: new Date("2025-03-28"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-19")
    }),
    new Stock({
      id: 16, produitId: 16, magasinId: 2, quantiteTotale: 60,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 6.50, prixVenteUnitaire: 9.90, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-20")
    }),
    new Stock({
      id: 17, produitId: 17, magasinId: 2, quantiteTotale: 30,
      quantiteReservee: 8, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 18.00, prixVenteUnitaire: 29.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-21")
    }),
    new Stock({
      id: 18, produitId: 18, magasinId: 2, quantiteTotale: 70,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 3.50, prixVenteUnitaire: 6.20, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-22")
    }),
    new Stock({
      id: 19, produitId: 19, magasinId: 2, quantiteTotale: 85,
      quantiteReservee: 25, seuilAlerte: 10, seuilReapprovisionnement: 15,
      dernierPrixAchat: 2.80, prixVenteUnitaire: 5.20, datePeremption: new Date("2024-01-20"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-23")
    }),
    new Stock({
      id: 20, produitId: 20, magasinId: 2, quantiteTotale: 140,
      quantiteReservee: 30, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 2.30, prixVenteUnitaire: 4.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-24")
    }),

    // Magasin 3 (Marseille) - Stocks pour produits 21-30
    new Stock({
      id: 21, produitId: 21, magasinId: 3, quantiteTotale: 100,
      quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 20,
      dernierPrixAchat: 0.90, prixVenteUnitaire: 1.80, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-15")
    }),
    new Stock({
      id: 22, produitId: 22, magasinId: 3, quantiteTotale: 180,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 25,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.90, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-16")
    }),
    new Stock({
      id: 23, produitId: 23, magasinId: 3, quantiteTotale: 70,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 1.60, prixVenteUnitaire: 2.90, datePeremption: new Date("2025-11-05"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-17")
    }),
    new Stock({
      id: 24, produitId: 24, magasinId: 3, quantiteTotale: 40,
      quantiteReservee: 10, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 7.50, prixVenteUnitaire: 12.00, datePeremption: new Date("2025-11-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-18")
    }),
    new Stock({
      id: 25, produitId: 25, magasinId: 3, quantiteTotale: 150,
      quantiteReservee: 40, seuilAlerte: 20, seuilReapprovisionnement: 30,
      dernierPrixAchat: 0.45, prixVenteUnitaire: 1.00, datePeremption: new Date("2025-03-30"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-19")
    }),
    new Stock({
      id: 26, produitId: 26, magasinId: 3, quantiteTotale: 35,
      quantiteReservee: 8, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 12.00, prixVenteUnitaire: 18.50, datePeremption: new Date("2025-11-08"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-20")
    }),
    new Stock({
      id: 27, produitId: 27, magasinId: 3, quantiteTotale: 20,
      quantiteReservee: 5, seuilAlerte: 3, seuilReapprovisionnement: 5,
      dernierPrixAchat: 15.00, prixVenteUnitaire: 24.99, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-21")
    }),
    new Stock({
      id: 28, produitId: 28, magasinId: 3, quantiteTotale: 65,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 2.20, prixVenteUnitaire: 4.00, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-22")
    }),
    new Stock({
      id: 29, produitId: 29, magasinId: 3, quantiteTotale: 55,
      quantiteReservee: 15, seuilAlerte: 5, seuilReapprovisionnement: 10,
      dernierPrixAchat: 2.50, prixVenteUnitaire: 4.80, datePeremption: new Date("2024-03-15"),
      statutStock: "En stock", dateDerniereMiseAJour: new Date("2025-03-23")
    }),
    new Stock({
      id: 30, produitId: 30, magasinId: 3, quantiteTotale: 160,
      quantiteReservee: 35, seuilAlerte: 15, seuilReapprovisionnement: 20,
      dernierPrixAchat: 0.80, prixVenteUnitaire: 1.50, statutStock: "En stock",
      dateDerniereMiseAJour: new Date("2025-03-24")
    })
  ];

  export const mouvements: MouvementsStock[] = [
    // Magasin 1 (Paris) - 15 mouvements
    new MouvementsStock({
      id: 1, ref: "MV-PAR-2025-001", produitId: 1, magasinId: 1, stockId: 1,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.20,
      acteurId: 201, description: "Livraison initiale", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 2, ref: "MV-PAR-2025-002", produitId: 1, magasinId: 1, stockId: 1,
      typeMouvement: "Sortie", quantite: 30, prixUnitaire: 2.50,
      acteurId: 301, description: "Vente client", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 3, ref: "MV-PAR-2025-003", produitId: 2, magasinId: 1, stockId: 2,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.30,
      acteurId: 202, description: "Réapprovisionnement", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 4, ref: "MV-PAR-2025-004", produitId: 3, magasinId: 1, stockId: 3,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 1.50,
      acteurId: 203, description: "Livraison fruits", dateMouvement: new Date("2025-03-14")
    }),
    new MouvementsStock({
      id: 5, ref: "MV-PAR-2025-005", produitId: 4, magasinId: 1, stockId: 4,
      typeMouvement: "Entree", quantite: 80, prixUnitaire: 0.80,
      acteurId: 204, description: "Livraison laitage", dateMouvement: new Date("2025-03-17")
    }),
    new MouvementsStock({
      id: 6, ref: "MV-PAR-2025-006", produitId: 5, magasinId: 1, stockId: 5,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.60,
      acteurId: 205, description: "Livraison boulangerie", dateMouvement: new Date("2025-03-18")
    }),
    new MouvementsStock({
      id: 7, ref: "MV-PAR-2025-007", produitId: 6, magasinId: 1, stockId: 6,
      typeMouvement: "Entree", quantite: 30, prixUnitaire: 8.50,
      acteurId: 206, description: "Livraison viande", dateMouvement: new Date("2025-03-19")
    }),
    new MouvementsStock({
      id: 8, ref: "MV-PAR-2025-008", produitId: 7, magasinId: 1, stockId: 7,
      typeMouvement: "Entree", quantite: 15, prixUnitaire: 25.00,
      acteurId: 207, description: "Livraison électroménager", dateMouvement: new Date("2025-03-20")
    }),
    new MouvementsStock({
      id: 9, ref: "MV-PAR-2025-009", produitId: 8, magasinId: 1, stockId: 8,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 5.80,
      acteurId: 208, description: "Livraison entretien", dateMouvement: new Date("2025-03-21")
    }),
    new MouvementsStock({
      id: 10, ref: "MV-PAR-2025-010", produitId: 9, magasinId: 1, stockId: 9,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 2.30,
      acteurId: 209, description: "Livraison surgelés", dateMouvement: new Date("2025-03-22")
    }),
    new MouvementsStock({
      id: 11, ref: "MV-PAR-2025-011", produitId: 10, magasinId: 1, stockId: 10,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 1.10,
      acteurId: 210, description: "Livraison hygiène", dateMouvement: new Date("2025-03-23")
    }),
    new MouvementsStock({
      id: 12, ref: "MV-PAR-2025-012", produitId: 2, magasinId: 1, stockId: 2,
      typeMouvement: "Sortie", quantite: 70, prixUnitaire: 0.80,
      acteurId: 302, description: "Vente client", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 13, ref: "MV-PAR-2025-013", produitId: 3, magasinId: 1, stockId: 3,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 2.80,
      acteurId: 303, description: "Vente client", dateMouvement: new Date("2025-03-14")
    }),
    new MouvementsStock({
      id: 14, ref: "MV-PAR-2025-014", produitId: 5, magasinId: 1, stockId: 5,
      typeMouvement: "Sortie", quantite: 80, prixUnitaire: 1.20,
      acteurId: 304, description: "Vente client", dateMouvement: new Date("2025-03-18")
    }),
    new MouvementsStock({
      id: 15, ref: "MV-PAR-2025-015", produitId: 7, magasinId: 1, stockId: 7,
      typeMouvement: "Sortie", quantite: 10, prixUnitaire: 39.99,
      acteurId: 305, description: "Vente client", dateMouvement: new Date("2025-03-20")
    }),

    // Magasin 2 (Lyon) - 15 mouvements
    new MouvementsStock({
      id: 16, ref: "MV-LYO-2025-001", produitId: 11, magasinId: 2, stockId: 11,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 1.80,
      acteurId: 211, description: "Livraison initiale", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 17, ref: "MV-LYO-2025-002", produitId: 11, magasinId: 2, stockId: 11,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 3.20,
      acteurId: 306, description: "Vente client", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 18, ref: "MV-LYO-2025-003", produitId: 12, magasinId: 2, stockId: 12,
      typeMouvement: "Entree", quantite: 80, prixUnitaire: 1.20,
      acteurId: 212, description: "Réapprovisionnement", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 19, ref: "MV-LYO-2025-004", produitId: 13, magasinId: 2, stockId: 13,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.20,
      acteurId: 213, description: "Livraison fruits", dateMouvement: new Date("2025-03-17")
    }),
    new MouvementsStock({
      id: 20, ref: "MV-LYO-2025-005", produitId: 14, magasinId: 2, stockId: 14,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.40,
      acteurId: 214, description: "Livraison laitage", dateMouvement: new Date("2025-03-18")
    }),
    new MouvementsStock({
      id: 21, ref: "MV-LYO-2025-006", produitId: 15, magasinId: 2, stockId: 15,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.35,
      acteurId: 215, description: "Livraison boulangerie", dateMouvement: new Date("2025-03-19")
    }),
    new MouvementsStock({
      id: 22, ref: "MV-LYO-2025-007", produitId: 16, magasinId: 2, stockId: 16,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 6.50,
      acteurId: 216, description: "Livraison viande", dateMouvement: new Date("2025-03-20")
    }),
    new MouvementsStock({
      id: 23, ref: "MV-LYO-2025-008", produitId: 17, magasinId: 2, stockId: 17,
      typeMouvement: "Entree", quantite: 20, prixUnitaire: 18.00,
      acteurId: 217, description: "Livraison électroménager", dateMouvement: new Date("2025-03-21")
    }),
    new MouvementsStock({
      id: 24, ref: "MV-LYO-2025-009", produitId: 18, magasinId: 2, stockId: 18,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 3.50,
      acteurId: 218, description: "Livraison entretien", dateMouvement: new Date("2025-03-22")
    }),
    new MouvementsStock({
      id: 25, ref: "MV-LYO-2025-010", produitId: 19, magasinId: 2, stockId: 19,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 2.80,
      acteurId: 219, description: "Livraison surgelés", dateMouvement: new Date("2025-03-23")
    }),
    new MouvementsStock({
      id: 26, ref: "MV-LYO-2025-011", produitId: 20, magasinId: 2, stockId: 20,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 2.30,
      acteurId: 220, description: "Livraison hygiène", dateMouvement: new Date("2025-03-24")
    }),
    new MouvementsStock({
      id: 27, ref: "MV-LYO-2025-012", produitId: 12, magasinId: 2, stockId: 12,
      typeMouvement: "Sortie", quantite: 50, prixUnitaire: 2.50,
      acteurId: 307, description: "Vente client", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 28, ref: "MV-LYO-2025-013", produitId: 13, magasinId: 2, stockId: 13,
      typeMouvement: "Sortie", quantite: 30, prixUnitaire: 2.30,
      acteurId: 308, description: "Vente client", dateMouvement: new Date("2025-03-17")
    }),
    new MouvementsStock({
      id: 29, ref: "MV-LYO-2025-014", produitId: 15, magasinId: 2, stockId: 15,
      typeMouvement: "Sortie", quantite: 60, prixUnitaire: 0.90,
      acteurId: 309, description: "Vente client", dateMouvement: new Date("2025-03-19")
    }),
    new MouvementsStock({
      id: 30, ref: "MV-LYO-2025-015", produitId: 17, magasinId: 2, stockId: 17,
      typeMouvement: "Sortie", quantite: 12, prixUnitaire: 29.99,
      acteurId: 310, description: "Vente client", dateMouvement: new Date("2025-03-21")
    }),

    // Magasin 3 (Marseille) - 15 mouvements
    new MouvementsStock({
      id: 31, ref: "MV-MAR-2025-001", produitId: 21, magasinId: 3, stockId: 21,
      typeMouvement: "Entree", quantite: 60, prixUnitaire: 0.90,
      acteurId: 221, description: "Livraison initiale", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 32, ref: "MV-MAR-2025-002", produitId: 21, magasinId: 3, stockId: 21,
      typeMouvement: "Sortie", quantite: 40, prixUnitaire: 1.80,
      acteurId: 311, description: "Vente client", dateMouvement: new Date("2025-03-15")
    }),
    new MouvementsStock({
      id: 33, ref: "MV-MAR-2025-003", produitId: 22, magasinId: 3, stockId: 22,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.80,
      acteurId: 222, description: "Réapprovisionnement", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 34, ref: "MV-MAR-2025-004", produitId: 23, magasinId: 3, stockId: 23,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 1.60,
      acteurId: 223, description: "Livraison fruits", dateMouvement: new Date("2025-03-17")
    }),
    new MouvementsStock({
      id: 35, ref: "MV-MAR-2025-005", produitId: 24, magasinId: 3, stockId: 24,
      typeMouvement: "Entree", quantite: 30, prixUnitaire: 7.50,
      acteurId: 224, description: "Livraison laitage", dateMouvement: new Date("2025-03-18")
    }),
    new MouvementsStock({
      id: 36, ref: "MV-MAR-2025-006", produitId: 25, magasinId: 3, stockId: 25,
      typeMouvement: "Entree", quantite: 100, prixUnitaire: 0.45,
      acteurId: 225, description: "Livraison boulangerie", dateMouvement: new Date("2025-03-19")
    }),
    new MouvementsStock({
      id: 37, ref: "MV-MAR-2025-007", produitId: 26, magasinId: 3, stockId: 26,
      typeMouvement: "Entree", quantite: 25, prixUnitaire: 12.00,
      acteurId: 226, description: "Livraison poisson", dateMouvement: new Date("2025-03-20")
    }),
    new MouvementsStock({
      id: 38, ref: "MV-MAR-2025-008", produitId: 27, magasinId: 3, stockId: 27,
      typeMouvement: "Entree", quantite: 15, prixUnitaire: 15.00,
      acteurId: 227, description: "Livraison électroménager", dateMouvement: new Date("2025-03-21")
    }),
    new MouvementsStock({
      id: 39, ref: "MV-MAR-2025-009", produitId: 28, magasinId: 3, stockId: 28,
      typeMouvement: "Entree", quantite: 50, prixUnitaire: 2.20,
      acteurId: 228, description: "Livraison entretien", dateMouvement: new Date("2025-03-22")
    }),
    new MouvementsStock({
      id: 40, ref: "MV-MAR-2025-010", produitId: 29, magasinId: 3, stockId: 29,
      typeMouvement: "Entree", quantite: 40, prixUnitaire: 2.50,
      acteurId: 229, description: "Livraison surgelés", dateMouvement: new Date("2025-03-23")
    }),
    new MouvementsStock({
      id: 41, ref: "MV-MAR-2025-011", produitId: 30, magasinId: 3, stockId: 30,
      typeMouvement: "Entree", quantite: 120, prixUnitaire: 0.80,
      acteurId: 230, description: "Livraison hygiène", dateMouvement: new Date("2025-03-24")
    }),
    new MouvementsStock({
      id: 42, ref: "MV-MAR-2025-012", produitId: 22, magasinId: 3, stockId: 22,
      typeMouvement: "Sortie", quantite: 80, prixUnitaire: 1.90,
      acteurId: 312, description: "Vente client", dateMouvement: new Date("2025-03-16")
    }),
    new MouvementsStock({
      id: 43, ref: "MV-MAR-2025-013", produitId: 23, magasinId: 3, stockId: 23,
      typeMouvement: "Sortie", quantite: 35, prixUnitaire: 2.90,
      acteurId: 313, description: "Vente client", dateMouvement: new Date("2025-03-17")
    }),
    new MouvementsStock({
      id: 44, ref: "MV-MAR-2025-014", produitId: 25, magasinId: 3, stockId: 25,
      typeMouvement: "Sortie", quantite: 60, prixUnitaire: 1.00,
      acteurId: 314, description: "Vente client", dateMouvement: new Date("2025-03-19")
    }),
    new MouvementsStock({
      id: 45, ref: "MV-MAR-2025-015", produitId: 27, magasinId: 3, stockId: 27,
      typeMouvement: "Sortie", quantite: 10, prixUnitaire: 24.99,
      acteurId: 315, description: "Vente client", dateMouvement: new Date("2025-03-21")
    })
  ];

export const transferts: Transfert[] = [
    // Transferts depuis Magasin 1 (Paris) - 15 transferts
    new Transfert({ id: 1, reference: "TRF-PAR-001", produitId: 1, quantite: 10, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-05"), statut: "Validé", agentResponsable: 401 }),
    new Transfert({ id: 2, reference: "TRF-PAR-002", produitId: 2, quantite: 20, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-07"), statut: "Validé", agentResponsable: 402 }),
    new Transfert({ id: 3, reference: "TRF-PAR-003", produitId: 3, quantite: 5, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-09"), statut: "En attente", agentResponsable: 403 }),
    new Transfert({ id: 4, reference: "TRF-PAR-004", produitId: 4, quantite: 8, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-11"), statut: "Refusé", motif: "Stock insuffisant", agentResponsable: 404 }),
    new Transfert({ id: 5, reference: "TRF-PAR-005", produitId: 5, quantite: 15, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-13"), statut: "Validé", agentResponsable: 405 }),
    new Transfert({ id: 6, reference: "TRF-PAR-006", produitId: 6, quantite: 3, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-15"), statut: "Validé", agentResponsable: 406 }),
    new Transfert({ id: 7, reference: "TRF-PAR-007", produitId: 7, quantite: 2, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-17"), statut: "En attente", agentResponsable: 407 }),
    new Transfert({ id: 8, reference: "TRF-PAR-008", produitId: 8, quantite: 4, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-19"), statut: "Refusé", motif: "Produit endommagé", agentResponsable: 408 }),
    new Transfert({ id: 9, reference: "TRF-PAR-009", produitId: 9, quantite: 6, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-21"), statut: "Validé", agentResponsable: 409 }),
    new Transfert({ id: 10, reference: "TRF-PAR-010", produitId: 10, quantite: 8, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-23"), statut: "Validé", agentResponsable: 410 }),
    new Transfert({ id: 11, reference: "TRF-PAR-011", produitId: 1, quantite: 5, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-25"), statut: "Validé", agentResponsable: 411 }),
    new Transfert({ id: 12, reference: "TRF-PAR-012", produitId: 2, quantite: 10, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-27"), statut: "En attente", agentResponsable: 412 }),
    new Transfert({ id: 13, reference: "TRF-PAR-013", produitId: 3, quantite: 4, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-01-29"), statut: "Validé", agentResponsable: 413 }),
    new Transfert({ id: 14, reference: "TRF-PAR-014", produitId: 4, quantite: 6, magasinSource: 1, magasinDestination: 3, dateTransfert: new Date("2025-01-31"), statut: "Refusé", motif: "Date péremption proche", agentResponsable: 414 }),
    new Transfert({ id: 15, reference: "TRF-PAR-015", produitId: 5, quantite: 12, magasinSource: 1, magasinDestination: 2, dateTransfert: new Date("2025-02-02"), statut: "Validé", agentResponsable: 415 }),

    // Transferts depuis Magasin 2 (Lyon) - 15 transferts
    new Transfert({ id: 16, reference: "TRF-LYO-001", produitId: 11, quantite: 15, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-06"), statut: "Validé", agentResponsable: 416 }),
    new Transfert({ id: 17, reference: "TRF-LYO-002", produitId: 12, quantite: 10, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-08"), statut: "Validé", agentResponsable: 417 }),
    new Transfert({ id: 18, reference: "TRF-LYO-003", produitId: 13, quantite: 8, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-10"), statut: "En attente", agentResponsable: 418 }),
    new Transfert({ id: 19, reference: "TRF-LYO-004", produitId: 14, quantite: 12, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-12"), statut: "Refusé", motif: "Stock critique", agentResponsable: 419 }),
    new Transfert({ id: 20, reference: "TRF-LYO-005", produitId: 15, quantite: 20, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-14"), statut: "Validé", agentResponsable: 420 }),
    new Transfert({ id: 21, reference: "TRF-LYO-006", produitId: 16, quantite: 5, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-16"), statut: "Validé", agentResponsable: 421 }),
    new Transfert({ id: 22, reference: "TRF-LYO-007", produitId: 17, quantite: 3, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-18"), statut: "En attente", agentResponsable: 422 }),
    new Transfert({ id: 23, reference: "TRF-LYO-008", produitId: 18, quantite: 6, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-20"), statut: "Refusé", motif: "Emballage abîmé", agentResponsable: 423 }),
    new Transfert({ id: 24, reference: "TRF-LYO-009", produitId: 19, quantite: 10, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-22"), statut: "Validé", agentResponsable: 424 }),
    new Transfert({ id: 25, reference: "TRF-LYO-010", produitId: 20, quantite: 7, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-24"), statut: "Validé", agentResponsable: 425 }),
    new Transfert({ id: 26, reference: "TRF-LYO-011", produitId: 11, quantite: 8, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-26"), statut: "Validé", agentResponsable: 426 }),
    new Transfert({ id: 27, reference: "TRF-LYO-012", produitId: 12, quantite: 12, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-01-28"), statut: "En attente", agentResponsable: 427 }),
    new Transfert({ id: 28, reference: "TRF-LYO-013", produitId: 13, quantite: 5, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-01-30"), statut: "Validé", agentResponsable: 428 }),
    new Transfert({ id: 29, reference: "TRF-LYO-014", produitId: 14, quantite: 9, magasinSource: 2, magasinDestination: 3, dateTransfert: new Date("2025-02-01"), statut: "Refusé", motif: "Produit périmé", agentResponsable: 429 }),
    new Transfert({ id: 30, reference: "TRF-LYO-015", produitId: 15, quantite: 15, magasinSource: 2, magasinDestination: 1, dateTransfert: new Date("2025-02-03"), statut: "Validé", agentResponsable: 430 }),

    // Transferts depuis Magasin 3 (Marseille) - 15 transferts
    new Transfert({ id: 31, reference: "TRF-MAR-001", produitId: 21, quantite: 12, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-07"), statut: "Validé", agentResponsable: 431 }),
    new Transfert({ id: 32, reference: "TRF-MAR-002", produitId: 22, quantite: 8, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-09"), statut: "Validé", agentResponsable: 432 }),
    new Transfert({ id: 33, reference: "TRF-MAR-003", produitId: 23, quantite: 6, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-11"), statut: "En attente", agentResponsable: 433 }),
    new Transfert({ id: 34, reference: "TRF-MAR-004", produitId: 24, quantite: 4, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-13"), statut: "Refusé", motif: "Stock réservé", agentResponsable: 434 }),
    new Transfert({ id: 35, reference: "TRF-MAR-005", produitId: 25, quantite: 18, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-15"), statut: "Validé", agentResponsable: 435 }),
    new Transfert({ id: 36, reference: "TRF-MAR-006", produitId: 26, quantite: 3, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-17"), statut: "Validé", agentResponsable: 436 }),
    new Transfert({ id: 37, reference: "TRF-MAR-007", produitId: 27, quantite: 2, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-19"), statut: "En attente", agentResponsable: 437 }),
    new Transfert({ id: 38, reference: "TRF-MAR-008", produitId: 28, quantite: 10, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-21"), statut: "Refusé", motif: "Commande annulée", agentResponsable: 438 }),
    new Transfert({ id: 39, reference: "TRF-MAR-009", produitId: 29, quantite: 7, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-23"), statut: "Validé", agentResponsable: 439 }),
    new Transfert({ id: 40, reference: "TRF-MAR-010", produitId: 30, quantite: 5, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-25"), statut: "Validé", agentResponsable: 440 }),
    new Transfert({ id: 41, reference: "TRF-MAR-011", produitId: 21, quantite: 9, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-27"), statut: "Validé", agentResponsable: 441 }),
    new Transfert({ id: 42, reference: "TRF-MAR-012", produitId: 22, quantite: 6, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-01-29"), statut: "En attente", agentResponsable: 442 }),
    new Transfert({ id: 43, reference: "TRF-MAR-013", produitId: 23, quantite: 5, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-01-31"), statut: "Validé", agentResponsable: 443 }),
    new Transfert({ id: 44, reference: "TRF-MAR-014", produitId: 24, quantite: 3, magasinSource: 3, magasinDestination: 2, dateTransfert: new Date("2025-02-02"), statut: "Refusé", motif: "Quantité insuffisante", agentResponsable: 444 }),
    new Transfert({ id: 45, reference: "TRF-MAR-015", produitId: 25, quantite: 12, magasinSource: 3, magasinDestination: 1, dateTransfert: new Date("2025-02-04"), statut: "Validé", agentResponsable: 445 })
];
export const depenses: Depense[] = [
    new Depense({ id: 1, date: new Date("2025-01-02"), categoryId: 1, amount: 1200.00, type: "STOCK", description: "Achat pâtes Barilla", paymentMode: "Virement", magasinId: 1 }),
    new Depense({ id: 2, date: new Date("2025-01-03"), categoryId: 2, amount: 450.50, type: "STANDARD", description: "Entretien camion livraison", paymentMode: "Chèque", magasinId: 1 }),
    new Depense({ id: 3, date: new Date("2025-01-05"), categoryId: 3, amount: 3200.00, type: "STOCK", description: "Achat viandes", paymentMode: "Virement", magasinId: 2 }),
    new Depense({ id: 4, date: new Date("2025-01-10"), categoryId: 4, amount: 180.75, type: "STANDARD", description: "Fournitures bureau", paymentMode: "Carte", magasinId: 2 }),
    new Depense({ id: 5, date: new Date("2025-01-12"), categoryId: 1, amount: 950.00, type: "STOCK", description: "Achat produits laitiers", paymentMode: "Virement", magasinId: 3 }),
    new Depense({ id: 6, date: new Date("2025-01-15"), categoryId: 5, amount: 420.30, type: "STANDARD", description: "Publicité locale", paymentMode: "Chèque", magasinId: 3 }),
    new Depense({ id: 7, date: new Date("2025-01-18"), categoryId: 2, amount: 150.00, type: "STANDARD", description: "Nettoyage magasin", paymentMode: "Espèces", magasinId: 1 }),
    new Depense({ id: 8, date: new Date("2025-01-20"), categoryId: 3, amount: 2800.00, type: "STOCK", description: "Achat boissons", paymentMode: "Virement", magasinId: 2 }),
    new Depense({ id: 9, date: new Date("2025-01-22"), categoryId: 4, amount: 75.60, type: "STANDARD", description: "Petit matériel", paymentMode: "Carte", magasinId: 3 }),
    new Depense({ id: 10, date: new Date("2025-01-25"), categoryId: 1, amount: 1650.00, type: "STOCK", description: "Achat fruits et légumes", paymentMode: "Virement", magasinId: 1 })
  ];

export const recettes: Recette[] = [
    new Recette({ id: 1, date: new Date("2025-01-02"), categoryId: 1, amount: 3500.75, description: "Vente journée", paymentMode: "Mixte", magasinId: 1 }),
    new Recette({ id: 2, date: new Date("2025-01-03"), categoryId: 2, amount: 2800.50, description: "Vente journée", paymentMode: "Mixte", magasinId: 2 }),
    new Recette({ id: 3, date: new Date("2025-01-04"), categoryId: 3, amount: 1950.25, description: "Vente journée", paymentMode: "Mixte", magasinId: 3 }),
    new Recette({ id: 4, date: new Date("2025-01-05"), categoryId: 1, amount: 4200.00, description: "Vente weekend", paymentMode: "Mixte", magasinId: 1 }),
    new Recette({ id: 5, date: new Date("2025-01-06"), categoryId: 2, amount: 3100.75, description: "Vente weekend", paymentMode: "Mixte", magasinId: 2 }),
    new Recette({ id: 6, date: new Date("2025-01-07"), categoryId: 3, amount: 2450.50, description: "Vente weekend", paymentMode: "Mixte", magasinId: 3 }),
    new Recette({ id: 7, date: new Date("2025-01-09"), categoryId: 1, amount: 3800.25, description: "Vente journée", paymentMode: "Mixte", magasinId: 1 }),
    new Recette({ id: 8, date: new Date("2025-01-10"), categoryId: 2, amount: 2950.00, description: "Vente journée", paymentMode: "Mixte", magasinId: 2 }),
    new Recette({ id: 9, date: new Date("2025-01-11"), categoryId: 3, amount: 2100.75, description: "Vente journée", paymentMode: "Mixte", magasinId: 3 }),
    new Recette({ id: 10, date: new Date("2025-01-12"), categoryId: 1, amount: 3650.50, description: "Vente promotionnelle", paymentMode: "Mixte", magasinId: 1 })
  ];

  export const paniers: Panier[] = [
    new Panier({ id: 1, clientId: 501, articles: [produits[0], produits[1]], stockList: [stocks[0], stocks[1]], totalHT: 45.50, tva: 8.19, totalTTC: 53.69, statut: "VALIDE", dateCreation: new Date("2025-01-02T10:15:00"), magasinId: 1 }),
    new Panier({ id: 2, clientId: 502, articles: [produits[2], produits[3]], stockList: [stocks[2], stocks[3]], totalHT: 38.40, tva: 6.91, totalTTC: 45.31, statut: "VALIDE", dateCreation: new Date("2025-01-03T11:30:00"), magasinId: 1 }),
    new Panier({ id: 3, clientId: 503, articles: [produits[4], produits[5]], stockList: [stocks[4], stocks[5]], totalHT: 72.00, tva: 12.96, totalTTC: 84.96, statut: "VALIDE", dateCreation: new Date("2025-01-04T14:45:00"), magasinId: 2 }),
    new Panier({ id: 4, clientId: 504, articles: [produits[6]], stockList: [stocks[6]], totalHT: 39.99, tva: 7.20, totalTTC: 47.19, statut: "VALIDE", dateCreation: new Date("2025-01-05T16:20:00"), magasinId: 3 }),
    new Panier({ id: 5, clientId: 505, articles: [produits[7], produits[8]], stockList: [stocks[7], stocks[8]], totalHT: 56.00, tva: 10.08, totalTTC: 66.08, statut: "VALIDE", dateCreation: new Date("2025-01-06T09:10:00"), magasinId: 2 }),
    new Panier({ id: 6, clientId: 506, articles: [produits[9]], stockList: [stocks[9]], totalHT: 26.40, tva: 4.75, totalTTC: 31.15, statut: "ANNULE", dateCreation: new Date("2025-01-07T17:30:00"), magasinId: 1 }),
    new Panier({ id: 7, clientId: 507, articles: [produits[0], produits[2], produits[4]], stockList: [stocks[0], stocks[2], stocks[4]], totalHT: 67.30, tva: 12.11, totalTTC: 79.41, statut: "VALIDE", dateCreation: new Date("2025-01-08T12:15:00"), magasinId: 3 }),
    new Panier({ id: 8, clientId: 508, articles: [produits[1], produits[3], produits[5]], stockList: [stocks[1], stocks[3], stocks[5]], totalHT: 94.80, tva: 17.06, totalTTC: 111.86, statut: "VALIDE", dateCreation: new Date("2025-01-09T15:45:00"), magasinId: 2 }),
    new Panier({ id: 9, clientId: 509, articles: [produits[6], produits[8]], stockList: [stocks[6], stocks[8]], totalHT: 44.49, tva: 8.01, totalTTC: 52.50, statut: "EN_COURS", dateCreation: new Date("2025-01-10T18:20:00"), magasinId: 1 }),
    new Panier({ id: 10, clientId: 510, articles: [produits[7], produits[9]], stockList: [stocks[7], stocks[9]], totalHT: 31.70, tva: 5.71, totalTTC: 37.41, statut: "VALIDE", dateCreation: new Date("2025-01-11T10:30:00"), magasinId: 3 })
  ];