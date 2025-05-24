export class Structure {
  id?: number;
  nom_structure!: string; // Nom de la structure
  logo?: string; // URL ou base64 du logo
  proprietaireId?: number; // ID de l'utilisateur propriétaire
  nombreMagasins!: number;
  type!: 'boutique' | 'alimentation' | 'ferme';
  devise!: 'FCFA' | 'USD' | 'EUR';
  
  // Contact
  email!: string;
  telephone!: string;
  adresse!: string;
  
  // Informations fiscales
  numeroIdentificationFiscale?: string;
  registreCommerce?: string;
  statutJuridique?: string;
  
  // Informations bancaires
  nomBanque?: string;
  numeroCompteBancaire?: string;
  fournisseurMobileMoney?: 'Orange Money' | 'Wave' | 'Free Money';
  
  // Informations administratives
  nombreEmployes?: number;
  responsableAdministratif?: string;
  horairesOuverture?: string;
  
  // Activité
  joursFermeture?: string;
  siteWeb?: string;
  reseauxSociaux?: string;
  
  // Sécurité
  personneConfiance?: string;
  assurances?: string;
  dateCreation!: Date;
  // Description
  description?: string;

  code_structure!: string;
  
  // Métadonnées
  dateCreationStructure?: Date;
  dateMiseAJour?: Date;
  estActive: boolean = true;

  constructor(data?: Partial<Structure>) {
    if (data) {
      Object.assign(this, data);
      // Convertir les dates si elles sont fournies en string
      if (data.dateCreation && typeof data.dateCreation === 'string') {
        this.dateCreation = new Date(data.dateCreation);
      }
      if (data.dateCreationStructure && typeof data.dateCreationStructure === 'string') {
        this.dateCreationStructure = new Date(data.dateCreationStructure);
      }
      if (data.dateMiseAJour && typeof data.dateMiseAJour === 'string') {
        this.dateMiseAJour = new Date(data.dateMiseAJour);
      }
    }
  }
}