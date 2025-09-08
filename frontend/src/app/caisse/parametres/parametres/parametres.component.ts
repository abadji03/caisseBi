import { Component, OnInit } from '@angular/core';
import { StructureComponent } from '../structure/structure.component';
import { RolesPermissionsComponent } from '../roles-permissions/roles-permissions.component';
import { UserComponent } from '../user/user.component';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [StructureComponent, RolesPermissionsComponent, UserComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css',
})
export class ParametresComponent implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
}
