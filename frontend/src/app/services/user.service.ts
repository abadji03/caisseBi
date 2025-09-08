import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../modeles/user.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:5000/api/users';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // Récupère tous les utilisateurs (filtrés par structure si nécessaire)
  getAll(): Observable<User[]> {
    const structureId = this.authService.getUserStructureId();
    const url = this.authService.isGeneralAdmin()
      ? this.apiUrl
      : `${this.apiUrl}?structure_id=${structureId}`;

    return this.http.get<User[]>(url, { headers: this.getHeaders() });
  }

  getAlls(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  // Récupère un utilisateur par son ID
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crée un nouvel utilisateur
  create(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user, { headers: this.getHeaders() });
  }

  // Met à jour un utilisateur existant
  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user, { headers: this.getHeaders() });
  }

  // Supprime un utilisateur
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Active/désactive un utilisateur
  updateStatus(id: number, status: boolean): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}/${id}/status`,
      { status },
      { headers: this.getHeaders() },
    );
  }

  // Change le mot de passe d'un utilisateur
  changePassword(id: number, newPassword: string): Observable<unknown> {
    return this.http.patch(
      `${this.apiUrl}/${id}/password`,
      { password: newPassword },
      { headers: this.getHeaders() },
    );
  }

  // Méthodes supplémentaires pour la gestion des utilisateurs

  // Recherche d'utilisateurs par critères
  search(criteria: { email?: string; nom?: string; role?: string }): Observable<User[]> {
    let query = '';
    if (criteria.email) query += `email=${criteria.email}&`;
    if (criteria.nom) query += `nom=${criteria.nom}&`;
    if (criteria.role) query += `role=${criteria.role}`;

    // Si ce n'est pas l'admin général, on filtre par structure
    if (!this.authService.isGeneralAdmin()) {
      query += `&structure_id=${this.authService.getUserStructureId()}`;
    }

    return this.http.get<User[]>(`${this.apiUrl}/search?${query}`, { headers: this.getHeaders() });
  }

  // Récupère les utilisateurs par structure
  getByStructure(code_structure: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${code_structure}/users`, {
      headers: this.getHeaders(),
    });
  }

  // Vérifie si un email est déjà utilisé
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-email?email=${email}`, {
      headers: this.getHeaders(),
    });
  }

  }
