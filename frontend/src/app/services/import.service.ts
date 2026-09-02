/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

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
    details: any[];
  };
}

export interface StructureDetection {
  entetes: string[];
  apercu: any[];
  totalLignes: number;
  typeDetecte: string;
  mappingSuggere?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  private apiUrl = `${environment.apiUrl}/imports`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders() {
    return { Authorization: `Bearer ${this.authService.getToken()}` };
  }

  detecterStructure(fichier: File, hasHeader = true): Observable<StructureDetection> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('hasHeader', hasHeader ? 'true' : 'false');
    return this.http.post<StructureDetection>(`${this.apiUrl}/detecter`, formData, {
      headers: this.getHeaders()
    });
  }

  importer(fichier: File, typeImport: string, mapping: any, options: any): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('typeImport', typeImport);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('updateExisting', options.updateExisting ? 'true' : 'false');
    formData.append('hasHeader', options.hasHeader !== false ? 'true' : 'false');
    
    return this.http.post<ImportResult>(`${this.apiUrl}`, formData, {
      headers: this.getHeaders()
    });
  }
}