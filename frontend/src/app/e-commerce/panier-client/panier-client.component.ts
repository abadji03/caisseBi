import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ApplicationService } from '../../services/application.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule,Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { Produit } from '../../modeles/produit.modele';
import { ToastrService } from 'ngx-toastr';
import { FooterUserComponent } from '../footer-user/footer-user.component';

@Component({
  selector: 'app-panier-client',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterOutlet, RouterModule, RouterLink],
  templateUrl: './panier-client.component.html',
  styleUrl: './panier-client.component.css'
})
export class PanierClientComponent {

  dataArray$ = this.prodSrv.current_prodArr$;
  cartSize$ = this.prodSrv.arraySize$;
  cartTotal$ = this.prodSrv.cartTotal$;

  constructor(private prodSrv:ApplicationService,private router:Router, private _location: Location, private toastr:ToastrService) {

  }

  retour() {
    this._location.back();
  }
  navigateToAlProduits(){
    this.router.navigate(['/Allproduits']);
  }

  showInfo(prod:Produit) {
    this.toastr.info('Le produit '+prod.nomCourt+' a été retiré du panier avec succés');
  }
  onDeleteInListePanier(prod:Produit){
    let confirmation = confirm("Retirer ce produit du panier ?");
    if(confirmation){
      //this.listeProduitsSelectionnes.splice(indexP,1);
      this.prodSrv.removeProduit(prod);
      this.showInfo(prod);
      //alert(this.listeProduitsSelectionnes.length)
    }
    else {
      console.log("Action annulée");
    }
  }

}
