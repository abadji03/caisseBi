import { Component } from '@angular/core';
import { RolesPermissionsComponent } from '../roles-permissions/roles-permissions.component';
import { UserComponent } from '../user/user.component';
import { StructureComponent } from '../structure/structure.component';

@Component({
  selector: 'app-parametres-users-admin',
  standalone: true,
  imports: [RolesPermissionsComponent, UserComponent,StructureComponent],
  templateUrl: './parametres-users-admin.component.html',
  styleUrl: './parametres-users-admin.component.css'
})
export class ParametresUsersAdminComponent {

}
