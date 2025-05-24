export class User {
  // Champs obligatoires
  id!: number;
  nom!: string;
  telephone!: string;
  email!: string;
  password!: string;
  typeUser!: string; // Ex : "Employé", "Gérant", "Caissier"
  status!: boolean; // Actif ou inactif
  role!: string; // Ex : "ADMIN", "CAISSIER", "GERANT"
 

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
