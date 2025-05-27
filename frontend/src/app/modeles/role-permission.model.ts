export class Permission {
    id?:number;
    nom!:string;
    niveau!:number;
    type?:'view_only'|'edit'|'delete'|'manage_users'|'manage_settings'|'full_access'|'view_only'


}

export class Role {
    id?:number;
    nom!: string;
}

export interface RolePermission {
  role: number;
  permissionIds: Permission[];
}

export interface UserRole {
  userId: number;
  roleIds: Role[]; 
}