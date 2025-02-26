import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../services/application.service';
import { Produit } from '../../../modeles/produit.modele';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './produits.component.html',
  styleUrl: './produits.component.css'
})
export class ProduitsComponent {

  isSidePanelVisible: boolean= false;
  isCheckedCase : boolean = false;
  capturingPicture : boolean = false;
  productsToRemove : Produit[] = [];
  fileName = '';
  localUrl!: any[];
  listeProduits:Produit[] = [];
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild("canvas") canvas!: ElementRef;
  public captures!: Array<any>;

  productObj: Produit = {
    /* "productId": 0,
    "productSku": "",
    "productName": "",
    "productPrice": 0,
    "productShortName": "",
    "productDescription": "",
    "createdDate": new Date(),
    "deliveryTimeSpan": "",
    "categoryId": 0,
    "productImageUrl": "" */
    id : 0,  
    "sku": "",
    "nomComplet": "",
    "prix": 0,
    "nomCourt": "",
    "description": "",
    "quantite":0,
    "dateCreation": new Date(),
    "deliveryTimeSpan": "",
    "categorie": "",
    "imageUrl": ""
  };
  categoryList: any [] = [];
  productsList: Produit [] = [];

  constructor(@Inject(PLATFORM_ID) private _platform: Object,private productSrv: ApplicationService) {
    this.captures = [];
  }
  ngOnInit(): void {
    localStorage.getItem("list_produits") === null ? this.productsList = this.productSrv.getProducts(): this.productsList = this.productSrv.getData();
       /* {
      this.productsList = this.productSrv.getProducts()
    }
    else{
      this.productsList = this.productSrv.getData();
    } */
    this.categoryList = this.productSrv.getCategory();
  
  }

  onFileSelected(event:any) {

    const file:File = event.target.files[0];

    if (file) {

        this.fileName = file.name;
        let reader = new FileReader();
        reader.onload = (event: any) => {
                this.localUrl = event.target.result;
            }
        reader.readAsDataURL(event.target.files[0]);

       /*  const formData = new FormData();

        formData.append("thumbnail", file);

        const upload$ = this.http.post("/api/thumbnail-upload", formData);

        upload$.subscribe(); */
    }
}

verifyCheckedCase() {
  const checkboxs = document.getElementsByName('checkCase');
  for(let i = 0; i < checkboxs.length; i++){
    const cb = checkboxs[i] as HTMLInputElement;
    if(cb.checked == true) {
     //this.isCheckedCase = true;
     const prod = this.productsList[i];
     this.productsToRemove.push(prod);
    }
    else {
      this.productsToRemove.splice(i,1);
    } 
  }
  this.productsToRemove.length > 1 ? this.isCheckedCase = true: this.isCheckedCase = false;
    
}

deleteAllSelectedProd(){
  const checkboxs = document.getElementsByName('checkCase');
  for(let i = 0; i < checkboxs.length; i++){
    const cb = checkboxs[i] as HTMLInputElement;
    if(cb.checked == true) {
      this.productsList.splice(i,1);
      localStorage.setItem("list_produits", JSON.stringify(this.productsList));
    }
  }
}
VerificationCheckedCase(){
  const selected = document.getElementById('checkAll') as HTMLInputElement;
  const checkboxs = document.getElementsByName('checkCase');

  if(selected.checked == true || this.productsToRemove.length > 1){
    this.deleteAllSelectedProd();
    window.location.reload();
  }
  else{
    alert("Veuillez sélectionner les produits à supprimer");
  }
}
selectAllProd(){
  const selected = document.getElementById('checkAll') as HTMLInputElement;
  const checkboxs = document.getElementsByName('checkCase');

  if(selected.checked == true){
    for(let i = 0; i < checkboxs.length; i++){
      const cb = checkboxs[i] as HTMLInputElement;
      cb.checked = true;
    }
    this.isCheckedCase = true;
  }
  else {
    for(let i = 0; i < checkboxs.length; i++){
      const cb = checkboxs[i] as HTMLInputElement;
      cb.checked = false;
  }
  this.isCheckedCase = false;
}
}
 
  onUpdate() {
    this.productSrv.saveProduct(this.productObj);
  }

  onSave() {
    this.productSrv.saveProduct(this.productObj);
  }
  onDelete(item: any) {
    const isDelete = confirm('Are you Sure want to delte');
    if(isDelete) {
      this.productSrv.deleteProduct(item.productId);
    }
  } 

/*   getALlCategory() {
    this.productSrv.getCategory().subscribe((res:any)=>{
      this.categoryList = res.data;
    })
  } */
  /* onUpdate() {
    this.productSrv.saveProduct(this.productObj).subscribe((res:any)=>{
      debugger;
      if(res.result) {
        alert("Product Created");
        this.getProducts();
      } else {
        alert(res.message)
      }
    })
  }
  onSave() {
    this.productSrv.saveProduct(this.productObj).subscribe((res:any)=>{
      debugger;
      if(res.result) {
        alert("Product Updated");
        this.getProducts();
      } else {
        alert(res.message)
      }
    })
  }
  onDelete(item: any) {
    const isDelete = confirm('Are you Sure want to delte');
    if(isDelete) {
      this.productSrv.deleteProduct(item.productId).subscribe((res:any)=>{
        debugger;
        if(res.result) {
          alert("Product Deleted");
          this.getProducts();
        } else {
          alert(res.message)
        }
      })
    }
  } */

store(prod: Produit){
    this.productSrv.saveData(prod);
    //window.location.reload();
}

get(){
    /* const fromStorage = this.productSrv.getData("list_produits") || '{}';
    this.listeProduits = JSON.parse(fromStorage)
    console.log(fromStorage) */
    this.productsList = this.productSrv.getData();
}

getById(valueToFind : string){
  
}

removeById(valueToFind: Produit){
      this.productSrv.removeProduct(valueToFind);
      //window.location.reload();
}

onEdit(item: any) {
    this.productObj = item;
    this.openSidePanel();
  }

openSidePanel() {
    this.isSidePanelVisible = true;
  }
closeSidePanel() {
    this.isSidePanelVisible = false;
  }
}
