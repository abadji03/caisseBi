export class User {
    id!: number;
    nom!: string;
    telephone!: number;
    email!: string;
    password!: string;
    adresse!: string;
    type_user!: string;
    status!: boolean;
    role!: boolean;

    constructor(data?: Partial<User>) {
      Object.assign(this, data);
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
