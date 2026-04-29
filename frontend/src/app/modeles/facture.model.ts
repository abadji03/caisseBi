// models/facture.model.ts
export interface Facture {
  id: number;
  numeroE: number;
  numero_facture: string;
  code_structure: string;
  clientId: number;
  fournisseurId?: number;
  magasinId: number;
  bonId?: number;
  panierId?: number;
  
  // Type
  type_facture: 'vente' | 'achat' | 'avoir' | 'commande' | 'regularisation';
  
  // Montants
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  montant_remise: number;
  montant_net: number;
  
  // Gestion des dettes cumulées
  dette_avant_facture: number;
  dette_apres_facture: number;
  
  // Statuts
  statut: 'brouillon' | 'emise' | 'annulee';
  
  // Dates
  date_facture: Date;
  //date_echeance?: Date;
  
  // Métadonnées
  commentaire?: string;
  generated_by?: string;
  pdf_path?: string;
  
  // Associations
  Client?: {
    id: number;
    nomComplet: string;
    telephone: string;
    adresse: string;
    email: string;
  };
  Fournisseur?: {
    id: number;
    nomComplet: string;
    telephone: string;
    adresse: string;
    email: string;
  };
  Magasin?: {
    id: number;
    nom: string;
  };
  Bon?: {
    id: number;
    numero: string;
    type: string;
  };
  Panier?: {
    id: number;
    ArticlePaniers?: ArticleFacture[];
  };
  
  created_at: Date;
  updated_at: Date;
}

export interface ArticleFacture {
  id: number;
  quantite: number;
  prixVenteUnitaire: number;
  prixAchatUnitaire: number;
  Produit?: {
    id: number;
    designation: string;
    reference: string;
  };
}

export interface FactureFilter {
  page?: number;
  limit?: number;
  statut?: string;
  type_facture?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}