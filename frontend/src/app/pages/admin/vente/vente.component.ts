import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterOutlet } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
import { Produit } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { ToastrService } from 'ngx-toastr';
import { GroupeByCategory } from '../../user/web-produits/interface/produitsParCategorie.interface';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-vente',
  standalone: true,
  imports: [CommonModule,MatIconModule,RouterOutlet, CarouselModule, FormsModule],
  templateUrl: './vente.component.html',
  styleUrl: './vente.component.css'
})
export class VenteComponent {
  isSidePanelVisible: boolean= false;
  productList: Produit[]=[];
  categoryList: any[] = [];
  categoryProduitList: GroupeByCategory[] = [];
  dataArray$ = this.prodSrv.current_prodArr$;
  cartSize$ = this.prodSrv.arraySize$;
  cartTotal$ = this.prodSrv.cartTotal$;



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

createPDF(){
   const DATA = document.getElementById('htmlData') as HTMLElement;
  const doc: jsPDF = new jsPDF("p", "mm", "a4");
  if(DATA !== null) {
    doc.html(DATA, {
     callback: (doc) => {
        // doc.output("dataurlnewwindow");
        doc.deletePage(doc.getNumberOfPages());
        doc.save('pdf-export');
     }
  });
  }
}
  public openPDF(): void {
    let DATA: any = document.getElementById('htmlData');
    html2canvas(DATA).then((canvas) => {
      let fileWidth = 208;
      let fileHeight = (canvas.height * fileWidth) / canvas.width;
      const FILEURI = canvas.toDataURL('image/png');
      let PDF = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      PDF.addImage(FILEURI, 'PNG', 0, position, fileWidth, fileHeight);
      PDF.save('angular-demo.pdf');
    });
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

  openSidePanel() {
    this.isSidePanelVisible = true;
  }
closeSidePanel() {
    this.isSidePanelVisible = false;
}
}
