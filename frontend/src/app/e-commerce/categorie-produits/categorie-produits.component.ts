import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApplicationService } from '../../services/application.service';
import { Produit } from '../../modeles/produit.modele';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { MatIconModule } from '@angular/material/icon';
import { CarouselModule } from 'primeng/carousel';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-categorie-produits',
  standalone: true,
  imports: [CommonModule, MatIconModule, CarouselModule],
  templateUrl: './categorie-produits.component.html',
  styleUrl: './categorie-produits.component.css'
})
export class CategorieProduitsComponent {

  activeCategoryId: number = 0;
  products: Produit [] = [];

  constructor(private activatedRoute: ActivatedRoute,private prdoSrv: ApplicationService, private toastr: ToastrService) {
    this.activatedRoute.params.subscribe((res:any) => {
      debugger;
      this.activeCategoryId =  res.id;
      this.loadProducts();
    })
  }

  loadProducts () {
    
    this.products = this.prdoSrv.getProductsByCategory(this.activeCategoryId);


  }

  showSuccess(prod:Produit) {
    this.toastr.success('Le produit '+prod.nomCourt+' a été ajouté au panier avec succés','',{positionClass:'toast-top-left'});
  }

  onSelectedProduit(product:Produit) {
    this.prdoSrv.addProduit(product);
    this.showSuccess(product);
    //console.log(this.selectedProduit.categorie);
    //alert("Vous m'avez cliqué "+product.categorie);
  }
  /* loadProducts () {
    this.prdoSrv.getProductsByCategory(this.activeCategoryId).subscribe((res:any)=>{
      this.products = res.data;
    })

  } */

}
