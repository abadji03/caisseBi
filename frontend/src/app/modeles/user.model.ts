import { Magasin } from "./magasin.model";

export class User {
  // Champs obligatoires
  id!: number;
  nom!: string;
  telephone!: string;
  email!: string;
  password!: string;
  status!: boolean; // Actif ou inactif
  //role!: string; // Ex : "ADMIN", "CAISSIER", "GERANT"
  roles?: Role[]; // Pour stocker les rôles complets
  //permissions?: Permission[]; // Pour stocker les permissions complètes
  // Champs optionnels
  adresse?: string;
  poste?: string; // Ex : "Caissier", "Gérant", "Employé"
  dateCreation?: Date;
  salaire?: number;
  typeContrat?: string; // Ex : "CDI", "CDD", "Stage"
  modePaiementSalaire?: string; // "Espèces", "Virement", "Mobile Money"
  photoProfil?: string; // URL ou base64 de la photo
  derniereConnexion?: Date;
  historiqueConnexions?: { date: Date; ip: string }[];
  historiqueActions?: { date: Date; action: string }[];
  structure_id?: number | null;
  code_structure?: string | null;
  isGeneralAdmin?: boolean; // Nouveau flag
  magasin?:Magasin; // Magasin associé à l'utilisateur


  constructor(data?: Partial<User>) {
    Object.assign(this, data);

    // Valeurs par défaut si non définies
    this.dateCreation = this.dateCreation || new Date();
    this.historiqueConnexions = this.historiqueConnexions || [];
    this.historiqueActions = this.historiqueActions || [];
  }
}

// models/utilisateur.model.ts
export interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: string;
  statut: 'actif' | 'inactif';
}

// models/role.model.ts
export interface Role {
  id: number;
  nom: string;
  description: string;
  permissions?: Permission[]; // Pour stocker les permissions complètes

}

export interface Permission {
  id: number;
  nom: string;
  niveau: number;
  type: string;
  valeur?: string;
}

// models/parametre-configuration.model.ts
export interface ParametreConfiguration {
  theme: string;
  langue: string;
  sauvegardeAutomatique: boolean;
  notifications: boolean;
  securite: {
    motDePasse: boolean;
    authentification2FA: boolean;
  };
}

export interface NavigationItem {
  label: string;
  icon?: string;
  route: string;
  titre: string;
  sousTitre: string;
  requiredRole?: string;
  requiredPermission?: string;
  children?: NavigationItem[];
}