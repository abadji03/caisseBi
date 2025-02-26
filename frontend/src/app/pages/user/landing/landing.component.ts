import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { ApplicationService } from '../../../services/application.service';
import { Produit } from '../../../modeles/produit.modele';
import {MatIconModule} from '@angular/material/icon';
import { WebProduitsComponent } from '../web-produits/web-produits.component';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatIconModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit{

  selectedProduct: any;
  productList: Produit[]=[];
  categoryList: any[] = [];
  listeProduitsSelectionnes: Produit[]=[];
  dataArray$ = this.prodSrv.current_prodArr$;
  cartSize$ = this.prodSrv.arraySize$;

  constructor(private prodSrv:ApplicationService,private router:Router, private toastr: ToastrService) {

  }

  ngOnInit(): void {
    this.getAllProducts();
    this.getAllCategory();
   /*  this.prodSrv.selectedProduct$.subscribe((value) => {

      this.selectedProduct = value;
      if(this.selectedProduct.nomComplet === undefined) {
        console.log("Undefined product")
      }
      else{
        this.listeProduitsSelectionnes.push(this.selectedProduct);
      }


    }); */
  }
  navigateToPRoducts(categorie: string) {
    this.router.navigate(['/produits',categorie])
  }

  navigateTopanier() {
    this.router.navigate(['/panier-client'])
    //alert("Vous m'avez cliqué")
  }

  getAllProducts() {

    this.productList = this.prodSrv.getProducts();
  }
  getAllCategory() {

    this.categoryList = this.prodSrv.getCategory();
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

onAjoutOcc (prod:any){
  prod.quantite++;
  this.prodSrv.updateQteProduct(prod, prod.quantite);
}

onReduitOcc (prod:any){
  if(prod.quantite ===1){
    console.log("Impossible de diminuer le nombre d'occurences")
  }
  else{
    prod.quantite--;
    this.prodSrv.updateQteProduct(prod, prod.quantite);
  }
}

 /*  addProductToCart(prod: any) {
    this.listeProduitsSelectionnes.push(prod);
  } */
  onConnexionPage() {
    this.router.navigateByUrl('login');
  }

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
