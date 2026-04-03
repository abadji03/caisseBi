import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface HistoriqueConnexion {
  id: number;
  date: Date;
  ip: string;
  userId: number;
  User?: {
    id: number;
    nom: string;
    email: string;
    code_structure: string;
  };
}

export interface HistoriqueAction {
  id: number;
  date: Date;
  action: string;
  ip: string;
  userId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  User?: {
    id: number;
    nom: string;
    email: string;
    code_structure: string;
  };
  actionType?: string;
  actionCategory?: string;
  readableDate?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
  userRole?: {
    isAdminGeneral: boolean;
    isAdminStructure: boolean;
    code_structure: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class HistoriqueService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/historiques-connexions-actions';

  /**
   * Récupérer l'historique des connexions d'un utilisateur
   */
  getConnexionsByUser(
    userId: number | string,
    params?: {
      page?: number;
      limit?: number;
      structureId?: string;
      dateDebut?: Date;
      dateFin?: Date;
    }
  ): Observable<PaginatedResponse<HistoriqueConnexion>> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.structureId) httpParams = httpParams.set('structureId', params.structureId);
      if (params.dateDebut) httpParams = httpParams.set('dateDebut', params.dateDebut.toISOString());
      if (params.dateFin) httpParams = httpParams.set('dateFin', params.dateFin.toISOString());
    }
    
    return this.http.get<PaginatedResponse<HistoriqueConnexion>>(
      `${this.apiUrl}/connexions/user/${userId}`,
      { params: httpParams }
    );
  }

  /**
   * Récupérer l'historique des actions d'un utilisateur
   */
  getActionsByUser(
    userId: number | string,
    params?: {
      page?: number;
      limit?: number;
      actionType?: string;
      actionCategory?: string;
      structureId?: string;
      dateDebut?: Date;
      dateFin?: Date;
    }
  ): Observable<PaginatedResponse<HistoriqueAction>> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.actionType) httpParams = httpParams.set('actionType', params.actionType);
      if (params.actionCategory) httpParams = httpParams.set('actionCategory', params.actionCategory);
      if (params.structureId) httpParams = httpParams.set('structureId', params.structureId);
      if (params.dateDebut) httpParams = httpParams.set('dateDebut', params.dateDebut.toISOString());
      if (params.dateFin) httpParams = httpParams.set('dateFin', params.dateFin.toISOString());
    }
    
    return this.http.get<PaginatedResponse<HistoriqueAction>>(
      `${this.apiUrl}/actions/user/${userId}`,
      { params: httpParams }
    );
  }

  /**
   * Récupérer toutes les actions récentes
   */
  getRecentActions(params?: {
    limit?: number;
    days?: number;
    structureId?: string;
    actionCategory?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.days) httpParams = httpParams.set('days', params.days.toString());
      if (params.structureId) httpParams = httpParams.set('structureId', params.structureId);
      if (params.actionCategory) httpParams = httpParams.set('actionCategory', params.actionCategory);
    }
    
    return this.http.get(`${this.apiUrl}/actions/recent`, { params: httpParams });
  }

  /**
   * Récupérer les statistiques des historiques
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHistoriqueStats(params?: { period?: 'week' | 'month' | 'year' }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.period) httpParams = httpParams.set('period', params.period);
    
    return this.http.get(`${this.apiUrl}/stats`, { params: httpParams });
  }
}
