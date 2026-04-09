import { Component } from '@angular/core';
import { UserComponent } from '../user/user.component';
import { StructureComponent } from '../structure/structure.component';
import { HistoriqueComponent } from '../historique/historique.component';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [StructureComponent, UserComponent,HistoriqueComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css',
})
export class ParametresComponent  {
  
}
