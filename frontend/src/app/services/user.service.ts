import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../modeles/user.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = "http://localhost:5000/api/users";
 
  constructor(private http: HttpClient,private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
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
    return this.http.get<User[]>(`${this.apiUrl}`, { headers: this.getHeaders() })
  }

  // Récupère un utilisateur par son ID
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crée un nouvel utilisateur
  // services/user.service.ts
create(user: User): Observable<User> {
  // Si ce n'est pas l'admin général, on force la structure_id
  /* if (!this.authService.isGeneralAdmin()) {
    const structureId = this.authService.getUserStructureId();
    if (structureId !== null) {
      user.structure_id = structureId;
    } else {
      // Gérer le cas où l'admin de structure n'a pas de structure_id
      throw new Error('Admin de structure doit avoir une structure associée');
    }
  } else {
    // Pour l'admin général, structure_id peut être null ou undefined
    user.structure_id = user.structure_id || null;
  } */
  
  return this.http.post<User>(this.apiUrl, user, { headers: this.getHeaders() });
}

  // Met à jour un utilisateur existant
  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user, { headers: this.getHeaders() });
  }

  // Supprime un utilisateur
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Active/désactive un utilisateur
  updateStatus(id: number, status: boolean): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}/${id}/status`, 
      { status }, 
      { headers: this.getHeaders() }
    );
  }

  // Change le mot de passe d'un utilisateur
  changePassword(id: number, newPassword: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/password`,
      { password: newPassword },
      { headers: this.getHeaders() }
    );
  }

  // Méthodes supplémentaires pour la gestion des utilisateurs

  // Recherche d'utilisateurs par critères
  search(criteria: { email?: string, nom?: string, role?: string }): Observable<User[]> {
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
      headers: this.getHeaders() 
    });
  }

  // Vérifie si un email est déjà utilisé
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${this.apiUrl}/check-email?email=${email}`,
      { headers: this.getHeaders() }
    );
  }




  /**

   * Write code on Method

   *

   * @return response()

   */

  /* getAll(): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/findAll')

    .pipe(

      catchError(this.errorHandler)

    )

  } */



  /**

   * Write code on Method

   *

   * @return response()

   */

 /*  create(user:User): Observable<any> {



    return this.httpClient.post(this.apiURL +this.prefixe+'/add/'+ user.email, JSON.stringify(user), this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  } */



  /**

   * Write code on Method

   *

   * @return response()

   */

  /* find(id:number): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/find/' + id)

    .pipe(

      catchError(this.errorHandler)

    )

  } */



  /**

   * Write code on Method

   *

   * @return response()

   */

  /* update(id:number, user:User): Observable<any> {



    return this.httpClient.put(this.apiURL+this.prefixe+ '/update/' + id, JSON.stringify(user), this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  }

  findUserWithEmail(email:string): Observable<any> {



    return this.httpClient.get(this.apiURL +this.prefixe+ '/findEmail/' + email)

    .pipe(

      catchError(this.errorHandler)

    )

  }

 */
  /**

   * Write code on Method

   *

   * @return response()

   */

  /* delete(id:number){

    return this.httpClient.delete(this.apiURL+this.prefixe+ '/delete/' + id, this.httpOptions)

    .pipe(

      catchError(this.errorHandler)

    )

  } */



  /**

   * Write code on Method

   *

   * @return response()

   */

  /* errorHandler(error:any) {

    let errorMessage = '';

    if(error.error instanceof ErrorEvent) {

      errorMessage = error.error.message;

    } else {

      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

    }

    return throwError(errorMessage);

 }

 getUsers(): User[] {
  return this.users;
}

addUser(user: User) {
  user.id = this.users.length + 1;
  this.users.push(user);
}

updateUser(id: number, updatedUser: User) {
  const index = this.users.findIndex(user => user.id === id);
  if (index !== -1) {
    this.users[index] = { ...updatedUser, id };
  }
}

deleteUser(id: number) {
  this.users = this.users.filter(user => user.id !== id);
} */
}
