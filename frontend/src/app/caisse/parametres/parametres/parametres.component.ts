import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { UserComponent } from '../user/user.component';
import { StructureComponent } from '../structure/structure.component';
import { HistoriqueComponent } from '../historique/historique.component';
import { Subject } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [StructureComponent, UserComponent,HistoriqueComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css',
})
export class ParametresComponent implements OnInit, OnDestroy  {

    isAdminGeneral = false;
    isAdminStructure = false;
    code_structure : string|null = null;
    private destroy$ = new Subject<void>();
    private authService = inject(AuthService);
  
    ngOnInit(): void {
      this.authService.currentUser.subscribe(user => {
        this.isAdminGeneral = this.authService.hasRole('Administrateur Général');
        this.isAdminStructure = (this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire')) && !this.isAdminGeneral;
        this.code_structure = user.code_structure || null;
      }); 
  
      
    }
 
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
  
}
