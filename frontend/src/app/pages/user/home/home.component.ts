import { Component } from '@angular/core';
import { WebProduitsComponent } from '../web-produits/web-produits.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [WebProduitsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
