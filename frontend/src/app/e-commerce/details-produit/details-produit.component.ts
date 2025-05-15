import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { Produit } from '../../modeles/produit.modele';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-details-produit',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './details-produit.component.html',
  styleUrl: './details-produit.component.css'
})
export class DetailsProduitComponent {

  activeProduitID: number = 0;
  produitD !: Produit;

  constructor(private activatedRoute: ActivatedRoute,private prdoSrv: ApplicationService, private toastr: ToastrService) {
    this.activatedRoute.params.subscribe((res:any) => {
      debugger;
      this.activeProduitID =  res.id;
      this.detailProduit();
    });
  }

  detailProduit () {
    
    this.produitD = this.prdoSrv.getSingleProduct(this.activeProduitID);

  }
  showSuccess(prod:Produit) {
    this.toastr.success('Le produit '+prod.nomCourt+' a été ajouté au panier avec succés','', {positionClass: 'toast-top-left' });
  }

  onSelectedProduit(product:Produit) {
    this.prdoSrv.addProduit(product);
    this.showSuccess(product);
    //console.log(this.selectedProduit.categorie);
    //alert("Vous m'avez cliqué "+product.categorie);
  }

  onAjoutOcc (prod:any){
    prod.quantite++;
    this.prdoSrv.updateQteProduct(prod, prod.quantite);
  }
  
  onReduitOcc (prod:any){
    if(prod.quantite ===1){
      console.log("Impossible de diminuer le nombre d'occurences")
    }
    else{
      prod.quantite--;
      this.prdoSrv.updateQteProduct(prod, prod.quantite);
    }
  }
}
