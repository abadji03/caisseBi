import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, finalize, Observable, switchMap, tap, throwError } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationItem, User } from '../modeles/user.model';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api'; // URL API
  private currentUserSubject = new BehaviorSubject<User>({} as User);
  public currentUser = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  // Configuration complète des menus par rôle
  private navigationConfig: Record<string, NavigationItem[]> = {
    'Administrateur Général': [
      /* {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      },
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/ventes',
        titre: 'Ventes',
        sousTitre: 'Gestion des ventes',
        children: [
          { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
          { label: 'Clients', route: '/caisse-bi/clients', titre: 'Ventes', sousTitre: 'Gestion des clients' }
        ]
      },
      {
        label: 'Stock & Inventaire',
        icon: 'bi-box',
        route: '/caisse-bi/entrees-sorties',
        titre: 'Stock & Inventaire',
        sousTitre: 'Gestion des entrées/sorties',
        children: [
          { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties' },
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock' },
          { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue' },
        ]
      },
      {
        label: 'Finance',
        icon: 'bi-wallet',
        route: '/caisse-bi/finance',
        titre: 'Finance',
        sousTitre: 'Gestion financière',
        children: [
          { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière' },
          { label: 'Fournisseurs', route: '/caisse-bi/fournisseurs', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
        ]
      },
      {
        label: 'Rapports',
        icon: 'bi-graph-up',
        route: '/caisse-bi/rapport-financier',
        titre: 'Rapports',
        sousTitre: 'Rapport financier',
        children: [
          { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier' },
          { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente' },
          { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock' }
        ]
      }, */
      /* {
        label: 'Compte & Paramètres',
        icon: 'bi-gear',
        route: '/caisse-bi/magasins',
        titre: 'Compte & Paramètres',
        sousTitre: 'Gestion des magasins',
        children: [
          { label: 'Magasins', route: '/caisse-bi/magasins', titre: 'Compte & Paramètres', sousTitre: 'Gestion des magasins' },
          { label: 'Personnel', route: '/caisse-bi/gerant', titre: 'Compte & Paramètres', sousTitre: 'Gestion du personnel' },
          { label: 'Paramètres', route: '/caisse-bi/parametres', titre: 'Compte & Paramètres', sousTitre: 'Gestion des paramètres' }
        ]
      } */
     {
        label: 'Paramètres',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/admin-general/structure', // Redirige directement vers paramètres
        titre: 'Structures et utilisateurs',
        sousTitre: 'Gestion des structures',
        children: [
          { 
            label: 'Structures', 
            route: '/caisse-bi/admin-general/structure', 
            titre: 'Administration générale', 
            sousTitre: 'Gestion des structures' 
          },
         /* { 
            label: 'Actions utilisateurs', 
            route: '/caisse-bi/historique-actions', // Créez cette route si nécessaire
            titre: 'Administration générale', 
            sousTitre: 'Historiques des actions des utilisateurs' 
          }  */ 
        ]
      }
    ],
    'Administrateur': [
      {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      },
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/ventes',
        titre: 'Ventes',
        sousTitre: 'Gestion des ventes',
        children: [
          { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
          //{ label: 'Clients', route: '/caisse-bi/clients', titre: 'Ventes', sousTitre: 'Gestion des clients' },
          { label: 'Clients', route: '/caisse-bi/client', titre: 'Ventes', sousTitre: 'Gestion des clients' }
        ]
      },
      {
        label: 'Stock & Inventaire',
        icon: 'bi-box',
        route: '/caisse-bi/entrees-sorties',
        titre: 'Stock & Inventaire',
        sousTitre: 'Gestion des entrées/sorties',
        children: [
          { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties' },
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock' },
          { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue' },
        ]
      },
      {
        label: 'Finance',
        icon: 'bi-wallet',
        route: '/caisse-bi/finance',
        titre: 'Finance',
        sousTitre: 'Gestion financière',
        children: [
          { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière' },
          //{ label: 'Fournisseurs', route: '/caisse-bi/fournisseurs', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
          { label: 'Fournisseurs', route: '/caisse-bi/fournisseur', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
        ]
      },
      {
        label: 'Rapports',
        icon: 'bi-graph-up',
        route: '/caisse-bi/rapport-financier',
        titre: 'Rapports',
        sousTitre: 'Rapport financier',
        children: [
          { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier' },
          { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente' },
          { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock' }
        ]
      },
      {
        label: 'Compte & Paramètres',
        icon: 'bi-gear',
        route: '/caisse-bi/gerant',
        titre: 'Compte & Paramètres',
        sousTitre: 'Gestion du personnel',
        children: [
          { label: 'Magasins', route: '/caisse-bi/magasins', titre: 'Compte & Paramètres', sousTitre: 'Gestion des magasins' },
          //{ label: 'Personnel', route: '/caisse-bi/gerant', titre: 'Compte & Paramètres', sousTitre: 'Gestion du personnel' },
          { label: 'Paramètres', route: '/caisse-bi/parametres', titre: 'Compte & Paramètres', sousTitre: 'Gestion des paramètres' },
          //{ label: 'Actions utilisateurs', route: '/caisse-bi/historique-actions', titre: 'Compte & Paramètres', sousTitre: 'Historiques des actions des utilisateurs' }
        ]
      }
    ],
    'Administrateur secondaire': [
      {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      },
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/ventes',
        titre: 'Ventes',
        sousTitre: 'Gestion des ventes',
        children: [
          { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
          //{ label: 'Clients', route: '/caisse-bi/clients', titre: 'Ventes', sousTitre: 'Gestion des clients' },
          { label: 'Clients', route: '/caisse-bi/client', titre: 'Ventes', sousTitre: 'Gestion des clients' }
        ]
      },
      {
        label: 'Stock & Inventaire',
        icon: 'bi-box',
        route: '/caisse-bi/entrees-sorties',
        titre: 'Stock & Inventaire',
        sousTitre: 'Gestion des entrées/sorties',
        children: [
          { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties' },
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock' },
          { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue' },
        ]
      },
      {
        label: 'Finance',
        icon: 'bi-wallet',
        route: '/caisse-bi/finance',
        titre: 'Finance',
        sousTitre: 'Gestion financière',
        children: [
          { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière' },
          //{ label: 'Fournisseurs', route: '/caisse-bi/fournisseurs', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
          { label: 'Fournisseurs', route: '/caisse-bi/fournisseur', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
        ]
      },
      {
        label: 'Rapports',
        icon: 'bi-graph-up',
        route: '/caisse-bi/rapport-financier',
        titre: 'Rapports',
        sousTitre: 'Rapport financier',
        children: [
          { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier' },
          { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente' },
          { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock' }
        ]
      },
      {
        label: 'Compte & Paramètres',
        icon: 'bi-gear',
        route: '/caisse-bi/gerant',
        titre: 'Compte & Paramètres',
        sousTitre: 'Gestion du personnel',
        children: [
          { label: 'Magasins', route: '/caisse-bi/magasins', titre: 'Compte & Paramètres', sousTitre: 'Gestion des magasins' },
          //{ label: 'Personnel', route: '/caisse-bi/gerant', titre: 'Compte & Paramètres', sousTitre: 'Gestion du personnel' },
          { label: 'Paramètres', route: '/caisse-bi/parametres', titre: 'Compte & Paramètres', sousTitre: 'Gestion des paramètres' },
        ]
      }
    ],
    'Gérant': [
      {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      },
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/ventes',
        titre: 'Ventes',
        sousTitre: 'Gestion des ventes',
        children: [
          { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
          //{ label: 'Clients', route: '/caisse-bi/clients', titre: 'Ventes', sousTitre: 'Gestion des clients' },
          { label: 'Clients', route: '/caisse-bi/client', titre: 'Ventes', sousTitre: 'Gestion des clients' }

        ]
      },
      {
        label: 'Stock & Inventaire',
        icon: 'bi-box',
        route: '/caisse-bi/entrees-sorties',
        titre: 'Stock & Inventaire',
        sousTitre: 'Gestion des entrées/sorties',
        children: [
          { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties' },
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock' },
          { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue' },
        ]
      },
      {
        label: 'Finance',
        icon: 'bi-wallet',
        route: '/caisse-bi/finance',
        titre: 'Finance',
        sousTitre: 'Gestion financière',
        children: [
          { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière' },
          //{ label: 'Fournisseurs', route: '/caisse-bi/fournisseurs', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
          { label: 'Fournisseurs', route: '/caisse-bi/fournisseur', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
        ]
      },
      {
        label: 'Rapports',
        icon: 'bi-graph-up',
        route: '/caisse-bi/rapport-financier',
        titre: 'Rapports',
        sousTitre: 'Rapport financier',
        children: [
          { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier' },
          { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente' },
          { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock' }
        ]
      }
    ],
    'Caissier': [
      /* {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      }, */
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/caisse',
        titre: 'Ventes',
        sousTitre: 'Gestion de la caisse',
        children: [
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
          //{ label: 'Clients', route: '/caisse-bi/clients', titre: 'Mes Clients', sousTitre: 'Gestion des clients' },
          { label: 'Clients', route: '/caisse-bi/client', titre: 'Ventes', sousTitre: 'Gestion des clients' }


        ]
      },
      {
        label: 'Stock',
        icon: 'bi-box',
        route: '/caisse-bi/stock',
        titre: 'Stock',
        sousTitre: 'Consultation du stock',
        children: [
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock', sousTitre: 'Consultation du stock' },
          //{ label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock', sousTitre: 'Consultation du catalogue' }
        ]
      },
      /* {
        label: 'Mes Clients',
        icon: 'bi-people',
        route: '/caisse-bi/clients',
        titre: 'Mes Clients',
        sousTitre: 'Gestion des clients',
        children: [
          { label: 'Clients', route: '/caisse-bi/clients', titre: 'Mes Clients', sousTitre: 'Gestion des clients' }
        ]
      } */
    ],
    'Employé': [
      {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      },
      {
        label: 'Ventes',
        icon: 'bi-cash-stack',
        route: '/caisse-bi/ventes',
        titre: 'Ventes',
        sousTitre: 'Gestion des ventes',
        children: [
          { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
          { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' }
        ]
      },
      {
        label: 'Stock',
        icon: 'bi-box',
        route: '/caisse-bi/stock',
        titre: 'Stock',
        sousTitre: 'Gestion du stock',
        children: [
          { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock', sousTitre: 'Gestion du stock' },
          //{ label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock', sousTitre: 'Consultation du catalogue' }
        ]
      }
    ]
  };

  private http = inject(HttpClient);
  private router = inject(Router);
  private logger = inject(NGXLogger);
  
  /* constructor() {
    this.loadUserFromStorage();
  } */

  initAuth(): Promise<void> {
  return new Promise((resolve) => {
    console.log('APP_INITIALIZER: Début initAuth');
    
    const token = this.getToken();
    console.log('Token présent:', !!token);
    
    if (!token) {
      console.log('Aucun token, résolution immédiate');
      resolve();
      return;
    }
    
    if (this.jwtHelper.isTokenExpired(token)) {
      console.log('Token expiré, logout');
      this.logout();
      resolve();
      return;
    }
    
    console.log('Token valide, récupération user');
    this.getMe().subscribe({
      next: () => {
        console.log('User récupéré avec succès');
        resolve();
      },
      error: (err) => {
        console.error('Erreur récupération user:', err);
        this.currentUserSubject.next({} as User);
        this.logout();
        resolve(); // TOUJOURS résoudre même en erreur
      }
    });
  });
}
  /* private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.getMe().subscribe({
        next: () => this.logger.info('Utilisateur chargé depuis le stockage local'),
        error: err => {
          this.logger.error('Erreur lors de la récupération de l\'utilisateur', err);
          this.logout();
        }
      });
    } else {
      this.logout();
    }
  } */

  login(email: string, password: string): Observable<User> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<{ token: string; user: any }>(`${this.apiUrl}/auth/connexion`, { email, password }).pipe(
      switchMap(response => {
        // Sauvegardez le token
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Créez une requête avec le header Authorization manuellement
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${response.token}`
        });
        
        return this.http.get<User>(`${this.apiUrl}/auth/me`, { headers });
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.debugUserInfo();
        this.redirectBasedOnRole(user);
      }),
      catchError(err => {
        this.logger.error('Erreur lors de la connexion', err);
        return throwError(() => err);
      })
    );
  }

  getMe(): Observable<User> {
    const token = this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<User>(`${this.apiUrl}/auth/me`,{ headers }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.logger.info('Utilisateur récupéré avec succès', user.nom);
      }),
      catchError(err => {
        this.logger.error('Erreur lors de la récupération de l\'utilisateur', err);
        return throwError(() => err);
      })
    );
  }

  // Méthode pour détecter si l'utilisateur est admin général
  isGeneralAdmin(): boolean {
    const user = this.currentUserSubject.value;
    // Méthode 1: Par structure_id null
    if (user && user.structure_id === null) {
      return true;
    }
    // Méthode 2: Par rôle
    if (user?.roles?.some(r => r.nom === 'Administrateur Général')) {
      return true;
    }
    // Méthode 3: Par flag isGeneralAdmin
    return user?.isGeneralAdmin || false;
  }
  
  private redirectBasedOnRole(user: User): void {
    console.log('Redirection basée sur le rôle de l\'utilisateur',user);
    if (!user || !user.roles || user.roles.length === 0) {
      this.router.navigate(['/unauthorized']);
      return;
    }
     if(!user.status){
      console.log('Utilisateur inactif, redirection vers unauthorized');
      //this.router.navigate(['/unauthorized']);
      return;
     }

    const userRoles = user.roles.map(r => r.nom);
   console.log('Rôles de l\'utilisateur:', userRoles);
    
    // Admin général: rediriger vers paramètres
    if (this.isGeneralAdmin()) {
      console.log('Admin général détecté, redirection vers paramètres');
      this.router.navigate(['/caisse-bi/admin-general/structure']);
      return;
    }
    
    if (userRoles.includes('Administrateur') || userRoles.includes('Administrateur secondaire')) {
      console.log('Redirection vers overview pour Administrateur');
      this.router.navigate(['/caisse-bi/overview']);
    }
    else if (userRoles.includes('Gérant')) {
      console.log('Redirection vers caisse pour Gérant');
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('Caissier')) {
      console.log('Redirection vers caisse pour Caissier');
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('Employé')) {
      console.log('Redirection vers overview pour Employé');
      this.router.navigate(['/caisse-bi/overview']);
    } 
    else {
      console.log('Aucun rôle reconnu, redirection vers unauthorized');
      console.log('Rôles disponibles:', userRoles);
      this.router.navigate(['/unauthorized']);
    }
  }

  /* logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next({} as User);
    this.router.navigate(['/login']);
  } */

  logout(): void {
  const token = localStorage.getItem('token');

  if (!token) {
    this.clearSession();
    return;
  }

  this.http.post('http://localhost:5000/api/auth/deconnexion', {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).pipe(
    finalize(() => this.clearSession())
  ).subscribe({
    next: () => console.log('✅ Déconnexion serveur OK'),
    error: err => console.error('❌ Erreur serveur:', err)
  });
}

private clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  this.currentUserSubject.next({} as User);
  this.router.navigate(['/login']);
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    //return token ? !this.jwtHelper.isTokenExpired(token) : false; */
    const token = this.getToken();
    return !!token && !this.jwtHelper.isTokenExpired(token);
  }

  getNavigationItems(): NavigationItem[] {
    const user = this.currentUserSubject.value;
    if (!user || !user.roles || user.roles.length === 0) return [];
    
    /* if (userRoles.includes('Administrateur Général')) {
      console.log('Navigation pour Administrateur Général');
      return this.navigationConfig['Administrateur Général'];
    }  */

     // Admin général: menu spécifique
    if (this.isGeneralAdmin()) {
      return this.navigationConfig['Administrateur Général'];
    }

    const userRoles = user.roles.map(r => r.nom);
    console.log('Rôles pour navigation:', userRoles);
    
    if (userRoles.includes('Administrateur') || userRoles.includes('Administrateur secondaire')) {
      console.log('Navigation pour Administrateur');
      return this.navigationConfig['Administrateur'];
    } else if (userRoles.includes('Gérant')) {
      console.log('Navigation pour Gérant');
      return this.navigationConfig['Gérant'];
    } else if (userRoles.includes('Caissier')) {
      console.log('Navigation pour Caissier');
      return this.navigationConfig['Caissier'];
    } else if (userRoles.includes('Employé')) {
      console.log('Navigation pour Employé');
      return this.navigationConfig['Employé'];
    }
    
    console.log('Aucun rôle correspondant, menu par défaut');
    return [
      {
        label: 'Accueil',
        icon: 'bi bi-house-door',
        route: '/caisse-bi/overview',
        titre: 'Accueil',
        sousTitre: 'Vue d\'ensemble',
        children: [
          { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble' },
        ],
      }
    ];
  }
  // Méthode utilitaire pour filtrer les items par permission
  filterItemsByPermission(items: NavigationItem[]): NavigationItem[] {
    return items.filter(item => {
      // Vérifier l'accès à l'item principal
      if (item.requiredPermission && !this.hasPermission(item.requiredPermission)) {
        return false;
      }
      if (item.requiredRole && !this.hasRole(item.requiredRole)) {
        return false;
      }

      // Filtrer les enfants
      if (item.children) {
        item.children = item.children.filter(child => {
          if (child.requiredPermission && !this.hasPermission(child.requiredPermission)) {
            return false;
          }
          if (child.requiredRole && !this.hasRole(child.requiredRole)) {
            return false;
          }
          return true;
        });

        // Si l'item n'a plus d'enfants et n'a pas de route propre, on le cache
        if (item.children.length === 0 && !item.route) {
          return false;
        }
      }

      return true;
    });
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;
    
    return user.roles.some(role => 
      role.permissions?.some(p => p.nom === permission)
    );
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;
    
    return user.roles.some(r => r.nom === role);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setUser(user: User) {
    this.currentUserSubject.next(user);
  }
  getUserStructureId(): number | null {
    return this.currentUserSubject.value?.structure_id || null;
  }

  getUserStructureName(): string {
    const user = this.currentUserSubject.value;
    return user?.code_structure || 'Nom Structure';
  }

  getUserName(): string {
    const user = this.currentUserSubject.value;
    return user?.nom || 'Utilisateur';
  }

  getUserEmail(): string {
    const user = this.currentUserSubject.value;
    return user?.email || '';
  }

  canAccess(permission?: string, role?: string): boolean {
    if (permission) {
      return this.hasPermission(permission);
    }
    if (role) {
      return this.hasRole(role);
    }
    return this.isAuthenticated();
  }

  findNavigationByRoute(url: string): { titre: string; sousTitre: string } | null {
    const items = this.getNavigationItems();

    for (const item of items) {
      // Route principale
      if (item.route === url) {
        return { titre: item.titre, sousTitre: item.sousTitre };
      }

      // Enfants
      for (const child of item.children || []) {
        if (child.route === url) {
          return {
            titre: child.titre,
            sousTitre: child.sousTitre || '',
          };
        }
      }
    }

    // Fallback : retourner l'item par défaut
    return { titre: 'Accueil', sousTitre: 'Vue d\'ensemble' };
  }

  // Méthode pour mettre à jour les permissions dynamiquement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateUserPermissions(roles: any[]): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      currentUser.roles = roles;
      this.currentUserSubject.next(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }

  // Vérifier si l'utilisateur a accès à un module spécifique
  hasModuleAccess(module: string): boolean {
    const modulePermissions: Record<string, string[]> = {
      'ventes': ['view_ventes', 'edit_ventes', 'manage_ventes'],
      'caisse': ['access_caisse', 'manage_caisse'],
      'clients': ['view_clients', 'edit_clients', 'manage_clients'],
      'stock': ['view_stock', 'edit_stock', 'manage_stock'],
      'catalogue': ['view_products', 'edit_products', 'manage_products'],
      'finance': ['view_finance', 'edit_finance', 'manage_finance'],
      'rapports': ['view_reports', 'generate_reports'],
      'parametres': ['manage_settings', 'manage_users'],
      'magasins': ['manage_stores', 'view_stores']
    };

    const permissions = modulePermissions[module] || [];
    return permissions.some(permission => this.hasPermission(permission));
  }

  debugUserInfo(): void {
    const user = this.currentUserSubject.value;
    const token = this.getToken();
    
    console.log('=== DEBUG AUTH SERVICE ===');
    console.log('Token présent:', !!token);
    console.log('Token valeur:', token?.substring(0, 20) + '...');
    console.log('Utilisateur dans BehaviorSubject:', user);
    console.log('Roles:', user?.roles?.map(r => r.nom));
    console.log('LocalStorage user:', localStorage.getItem('user'));
    console.log('LocalStorage token:', localStorage.getItem('token'));
    console.log('Navigation items:', this.getNavigationItems().length);
    console.log('=== FIN DEBUG ===');
  }
}