import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { Permission, Role, RolePermission } from '../modeles/role-permission.model';
import { User } from '../modeles/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RolePermissionsService {
  private readonly baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  //constructor() {}

  /*--------------Services Roles------------- */
  //Lister tous les rôles
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles`);
  }

  //Obtenir un rôle par ID
  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/roles/${id}`);
  }

  //Créer un rôle
  createRole(role: Role): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/roles`, role);
  }

  //Mettre à jour un rôle
  updateRole(id: number, role: Role): Observable<Role> {
    return this.http.put<Role>(`${this.baseUrl}/roles/${id}`, role);
  }

  //Supprimer un rôle
  deleteRole(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/roles/${id}`);
  }

  /*--------------Services Permissions------------- */

  //Lister toutes les permissions
  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/permissions`);
  }

  //Obtenir une permission par ID
  getPermissionById(id: number): Observable<Permission> {
    return this.http.get<Permission>(`${this.baseUrl}/permissions/${id}`);
  }

  //Créer une permission
  createPermission(permission: Permission): Observable<Permission> {
    return this.http.post<Permission>(`${this.baseUrl}/permissions`, permission);
  }

  //Mettre à jour une permission
  updatePermission(id: number, permission: Permission): Observable<Permission> {
    return this.http.put<Permission>(`${this.baseUrl}/permissions/${id}`, permission);
  }

  //Supprimer une permission
  deletePermission(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  /*--------------Services Roles,Permissions, Users------------- */
  //Récupérer les permissions d’un rôle
  getPermissionsByRole(role_id: number): Observable<RolePermission> {
    return this.http.get<RolePermission>(`${this.baseUrl}/role-permissions/${role_id}/permissions`);
  }

  getPermissionsIdByRole(roleId: number): Observable<{ permissionIds: number[] }> {
    return this.http.get<User[]>(`${this.baseUrl}/role-permissions/${roleId}/permissions`).pipe(
      map((permissions) => ({
        permissionIds: permissions.map((p) => p.id), // Extrait seulement les IDs
      })),
      catchError((error) => {
        console.error('Error fetching permissions', error);
        return of({ permissionIds: [] }); // Retourne un tableau vide en cas d'erreur
      }),
    );
  }

  getRolesIdByUser(userId: number): Observable<{ roleIds: number[] }> {
    return this.http.get<User[]>(`${this.baseUrl}/user-roles/${userId}/roles`).pipe(
      map((roles) => ({
        roleIds: roles.map((p) => p.id), // Extrait seulement les IDs
      })),
      catchError((error) => {
        console.error('Error fetching permissions', error);
        return of({ roleIds: [] }); // Retourne un tableau vide en cas d'erreur
      }),
    );
  }

  //Affecter des permissions à un rôle
  assignPermissionsToRole(role_id: number, data: RolePermission): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/role-permissions/${role_id}/permissions`, data);
  }

  //Récupérer les roles d’un utilisateur
  /*  getRolesByUser(userId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/user-roles/${userId}/roles`);
  } */

  getRolesByUser(userId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/user-roles/${userId}/roles`);
  }

  getUserRole(user: User): Observable<string[]> {
    return this.getRolesByUser(user.id).pipe(map((roles) => roles.map((role) => role.nom)));
  }

  //Affecter des roles à un utilisateur
  assignRolesToUser(userId: number, roleIds: number[]): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/user-roles/${userId}/roles`, { roleIds: roleIds });
  }

  // Assigner ou mettre à jour des rôles
  updateRolesForUser(userId: number, roleIds: number[]) {
    return this.http.put(`${this.baseUrl}/user-roles/${userId}`, { roleIds });
  }

  // Supprimer des rôles pour un utilisateur
  removeRolesFromUser(userId: number, roleIds: number[]) {
    return this.http.request('delete', `${this.baseUrl}/user-roles/${userId}`, {
      body: { roleIds },
    });
  }

  // Assigner ou mettre à jour des permissions pour un rôle
  updatePermissionsForRole(roleId: number, permissionIds: number[]) {
    return this.http.put(`${this.baseUrl}/role-permissions/${roleId}`, { permissionIds });
  }

  // Supprimer des permissions pour un rôle
  removePermissionsFromRole(roleId: number, permissionIds: number[]) {
    return this.http.request('delete', `${this.baseUrl}/role-permissions/${roleId}`, {
      body: { permissionIds },
    });
  }
}
