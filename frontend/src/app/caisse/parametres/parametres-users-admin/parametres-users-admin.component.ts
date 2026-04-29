import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RolesPermissionsComponent } from '../roles-permissions/roles-permissions.component';
import { UserComponent } from '../user/user.component';
import { StructureComponent } from '../structure/structure.component';
import { HistoriqueComponent } from '../historique/historique.component';
import { Subject } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-parametres-users-admin',
  standalone: true,
  imports: [RolesPermissionsComponent, UserComponent,StructureComponent,HistoriqueComponent],
  templateUrl: './parametres-users-admin.component.html',
  styleUrl: './parametres-users-admin.component.css'
})
export class ParametresUsersAdminComponent implements OnInit,OnDestroy {

    isAdminGeneral = false;
    isAdminStructure = false;
    code_structure : string|null = null;
    structure_id : number|null = null;
    private destroy$ = new Subject<void>();
    private authService = inject(AuthService);
  
    ngOnInit(): void {
      this.authService.currentUser.subscribe(user => {
        this.isAdminGeneral = this.authService.hasRole('Administrateur Général');
        this.isAdminStructure = (this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire')) && !this.isAdminGeneral;
        this.code_structure = user.code_structure || null;
        this.structure_id = user.structure_id || null;
      }); 
  
      
    }
  
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

}
