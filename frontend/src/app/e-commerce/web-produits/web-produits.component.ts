import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApplicationService } from '../../services/application.service';
import { Produit } from '../../modeles/produit.modele';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button'; 
import { GroupeByCategory } from './interface/produitsParCategorie.interface';

@Component({
  selector: 'app-web-produits',
  standalone: true,
  imports: [CommonModule, MatIconModule,RouterOutlet, CarouselModule, ButtonModule],
  templateUrl: './web-produits.component.html',
  styleUrl: './web-produits.component.css'
})

export class WebProduitsComponent implements OnInit{

  //@Output() selectedProduct = new EventEmitter<any>();
  productList: Produit[]=[];
  categoryList: any[] = [];
  categoryProduitList: GroupeByCategory[] = [];
  /* listeProduitsSelectionnes: Produit[]=[]; */
 

  /* productList: Produit[]=[];
  categoryList: string[] = []; */
  constructor(private prodSrv:ApplicationService,private router:Router,private toastr: ToastrService) {

  }

  ngOnInit(): void {
    this.productList = this.prodSrv.getProducts();
    this.categoryList = this.prodSrv.getCategory();

    const group = this.productList.reduce((acc:any, product) => {
      if (!acc[product.categorie]) {
        acc[product.categorie] = [];
      }
      acc[product.categorie].push(product);
      return acc;
    }, {}); 
    
    this.categoryProduitList = Object.keys(group ).map(key => ({
      category: key,
      products: group[key]
    }));


  }
  navigateToPRoductsCategory(id: number) {
    this.router.navigate(['/produits',id])
  }


  navigateToDetailsProduct(id: number) {
    this.router.navigate(['/details-produit',id])
  }
  
  showSuccess(prod:Produit) {
    this.toastr.success('Le produit '+prod.nomCourt+' a été ajouté au panier avec succés','', {positionClass: 'toast-top-left' });
  }
  onSelectedProduit(product:Produit) {
    this.prodSrv.addProduit(product);
    this.showSuccess(product);
    //console.log(this.selectedProduit.categorie);
    //alert("Vous m'avez cliqué "+product.categorie);
  }
  /* sendSelectedProduit(prod: any) {
    this.selectedProduct.emit(prod);
  } */

  /* getAllProducts() {
    this.prodSrv.getProducts().subscribe((res:any)=>{
      debugger;
      this.productList = res.data;
    })
  }
  getAllCategory() {
    this.prodSrv.getCategory().subscribe((res:any)=>{
      this.categoryList = res.data;
    })
  } */

}
