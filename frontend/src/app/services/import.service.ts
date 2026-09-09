/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Une ligne d'import/aperçu : colonnes hétérogènes provenant d'un fichier externe. */
type Row = Record<string, unknown>;

/** Détail d'une ligne traitée lors d'un import (renvoyé par le backend). */
export interface ImportResultDetail {
  ligne?: number;
  type: string;
  id?: number;
  message?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  results: {
    importes: number;
    total: number;
    /** Nombre d'erreurs (raccourci numérique) */
    nombreErreurs: number;
    /** Détail des erreurs */
    erreurs: { ligne?: number; message: string }[];
    details: ImportResultDetail[];
  };
}

export interface StructureDetection {
  entetes: string[];
  apercu: Row[];
  totalLignes: number;
  typeDetecte: string;
  mappingSuggere?: Record<string, string>;
}

export interface ImportOptions {
  updateExisting?: boolean;
  hasHeader?: boolean;
  defaultStructureId?: number;
  defaultCategorieId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private apiUrl = `${environment.apiUrl}/imports`;
  private http = inject(HttpClient);

  detecterStructure(fichier: File, hasHeader = true): Observable<StructureDetection> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('hasHeader', hasHeader ? 'true' : 'false');
    return this.http.post<StructureDetection>(`${this.apiUrl}/detecter`, formData, {
    });
  }

  importer(fichier: File, typeImport: string, mapping: Record<string, string>, options: ImportOptions = {}): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('typeImport', typeImport);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('updateExisting', options.updateExisting ? 'true' : 'false');
    formData.append('hasHeader', options.hasHeader !== false ? 'true' : 'false');
    
    return this.http.post<ImportResult>(`${this.apiUrl}`, formData, {
    });
  }
}