/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ToastrService } from 'ngx-toastr';
import { catchError, map, Observable, tap } from 'rxjs';
import { Operation, OperationsFilters, OperationsResponse, StatsResponse } from '../modeles/operation.model';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

@Injectable({
  providedIn: 'root'
})
export class OperationsService {

  private apiUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private logger = inject(NGXLogger);
  private toastr = inject(ToastrService);

  private handleError(error: unknown, message: string) {
    // Le service ne doit PAS afficher de toast : le composant reste
    // responsable du message métier (voir contrat api-error.ts).
    return handleApiError(this.logger, 'OperationsService', error, message);
  }


  // ==============================
  // MÉTHODES PRINCIPALES
  // ==============================

  getOperations(filters: OperationsFilters = {}): Observable<OperationsResponse> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof OperationsFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<OperationsResponse>(`${this.apiUrl}/operations`, {
      params
    }).pipe(
      tap(response => this.logger.info(`Opérations chargées: ${response.operations.length} / ${response.total} total`)),
      catchError(error => this.handleError(error, 'Erreur chargement opérations'))
    );
  }

  private getOperationsByEntity(
    endpoint: string,
    code_structure: string,
    entityId: number,
    filters: Record<string, string | number | undefined> = {}
  ): Observable<Operation[]> {
    let params = new HttpParams()
      .set('code_structure', code_structure);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<Operation[]>(
      `${this.apiUrl}/operations/${endpoint}/${code_structure}/${entityId}`,
      { params }
    ).pipe(
      tap(operations => this.logger.info(`Opérations ${endpoint} chargées: ${operations.length}`)),
      catchError(error => this.handleError(error, `Erreur chargement opérations ${endpoint}`))
    );
  }

  getOperationsByFournisseur(
    code_structure: string,
    fournisseurId: number,
    filters: Omit<OperationsFilters, 'code_structure' | 'fournisseurId'> = {}
  ): Observable<Operation[]> {
    return this.getOperationsByEntity('fournisseur', code_structure, fournisseurId, { ...filters, fournisseurId });
  }

  getOperationsByClient(
    code_structure: string,
    clientId: number,
    filters: Omit<OperationsFilters, 'code_structure' | 'clientId'> = {}
  ): Observable<Operation[]> {
    return this.getOperationsByEntity('client', code_structure, clientId, { ...filters, clientId });
  }

  getOperationById(id: number): Observable<Operation> {
    return this.http.get<Operation>(`${this.apiUrl}/operations/${id}`, {
    }).pipe(
      tap(operation => this.logger.info('Détails opération chargés', operation)),
      catchError(error => this.handleError(error, `Erreur chargement opération ${id}`))
    );
  }

  // ==============================
  // MÉTHODES DE CRÉATION
  // ==============================

  createOperation(operationData: Partial<Operation>): Observable<Operation> {
    return this.http.post<Operation>(`${this.apiUrl}/operations`, operationData, {
    }).pipe(
      tap(operation => this.logger.info('Opération créée', operation)),
      catchError(error => this.handleError(error, 'Erreur création opération'))
    );
  }

  createOperationFromBon(bonData: any): Observable<Operation> {
    return this.createOperation({
      type: bonData.type.toUpperCase() || 'BON',
      bonId: bonData.id,
      fournisseurId: bonData.fournisseurId,
      clientId: bonData.clientId,
      magasinId: bonData.magasinId,
      resteAPayer: bonData.resteAPayer,
      code_structure: bonData.code_structure,
      montantPaye: bonData.avance || 0,
      statut: bonData.statutBon?.toUpperCase() || 'BROUILLON',
      dateOperation: bonData.dateBon || new Date(),
      commentaire: `Bon ${bonData.type} - ${bonData.numero}`,
      numeroBon: bonData.numero,
      fichier: bonData.fichier
    });
  }

  createOperationFromPaiement(paiementData: any): Observable<Operation> {
    const typeOperation = paiementData.typePaiement === 'client' ? 'REGLEMENT' : 'VERSEMENT';
    return this.createOperation({
      type: typeOperation,
      paiementId: paiementData.id,
      bonId: paiementData.bonId,
      fournisseurId: paiementData.fournisseurId,
      clientId: paiementData.clientId,
      magasinId: paiementData.magasinId,
      code_structure: paiementData.code_structure,
      montantPaye: paiementData.montant,
      statut: paiementData.statut?.toUpperCase() || 'EFFECTUE',
      dateOperation: paiementData.date || new Date(),
      commentaire: paiementData.description || `${typeOperation} - ${paiementData.numero}`,
      numeroVersement: paiementData.numero,
      moyenPaiement: paiementData.methodePaiement,
      fichier: paiementData.fichier
    });
  }

  // ==============================
  // MÉTHODES DE MISE À JOUR ET SUPPRESSION
  // ==============================

  updateOperation(id: number, updateData: Partial<Operation>): Observable<Operation> {
    return this.http.put<Operation>(`${this.apiUrl}/operations/${id}`, updateData, {
    }).pipe(
      tap(operation => this.logger.info('Opération mise à jour', operation)),
      catchError(error => this.handleError(error, `Erreur mise à jour opération ${id}`))
    );
  }

  deleteOperation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/operations/${id}`, {
    }).pipe(
      tap(() => this.logger.warn(`Opération supprimée: ${id}`)),
      catchError(error => this.handleError(error, `Erreur suppression opération ${id}`))
    );
  }

  // ==============================
  // STATISTIQUES
  // ==============================

  getOperationsStats(filters: Omit<OperationsFilters, 'page' | 'limit'> = {}): Observable<StatsResponse[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<StatsResponse[]>(`${this.apiUrl}/operations/stats`, { params
    }).pipe(
      tap(stats => this.logger.info('Statistiques chargées', stats)),
      catchError(error => this.handleError(error, 'Erreur chargement statistiques'))
    );
  }

  // TODO: Déplacer côté serveur
  getSoldeFournisseur(code_structure: string, fournisseurId: number): Observable<number> {
    return this.getOperationsByFournisseur(code_structure, fournisseurId).pipe(
      map(operations => {
        const solde = operations.reduce((total, op) => {
          if (op.type === 'BON') return total - (op.resteAPayer || 0);
          if (op.type === 'VERSEMENT') return total + (op.montantPaye || 0);
          return total;
        }, 0);
        this.logger.info(`Solde fournisseur ${fournisseurId}`, solde);
        return solde;
      })
    );
  }

  // TODO: Déplacer côté serveur
  getSoldeClient(code_structure: string, clientId: number): Observable<number> {
    return this.getOperationsByClient(code_structure, clientId).pipe(
      map(operations => {
        const solde = operations.reduce((total, op) => {
          if (op.type === 'BON') return total + (op.resteAPayer || 0);
          if (op.type === 'REGLEMENT') return total - (op.montantPaye || 0);
          return total;
        }, 0);
        this.logger.info(`Solde client ${clientId}`, solde);
        return solde;
      })
    );
  }

  // ==============================
  // UTILITAIRES - À extraire dans OperationHelper
  // ==============================

  static filterOperationsByType(operations: Operation[], type: string): Operation[] {
    return operations.filter(op => op?.type?.toLowerCase() === type.toLowerCase());
  }

  static filterOperationsByStatut(operations: Operation[], statut: string): Operation[] {
    return operations.filter(op => op.statut.toLowerCase() === statut.toLowerCase());
  }

  static calculerTotalOperations(operations: Operation[]): number {
    return operations.reduce((total, op) => total + (op.montantPaye || 0), 0);
  }

  static hasBonDetails(operation: Operation): boolean {
    return !!(operation.bon && operation.bon?.Panier);
  }

  static hasPaiementDetails(operation: Operation): boolean {
    return !!operation.paiement;
  }

  static getNombreArticles(operation: Operation): number {
    if (this.hasBonDetails(operation) && operation.bon?.Panier?.articles) {
      return operation.bon.Panier.articles.length;
    }
    return 0;
  }

  rafraichirOperationsApresEnregistrement(
    code_structure: string,
    fournisseurId?: number,
    clientId?: number
  ): Observable<Operation[]> {
    this.logger.info('Rafraîchissement des opérations');
    if (fournisseurId) return this.getOperationsByFournisseur(code_structure, fournisseurId);
    if (clientId) return this.getOperationsByClient(code_structure, clientId);
    return this.getOperations({ code_structure }).pipe(map(response => response.operations));
  }

}