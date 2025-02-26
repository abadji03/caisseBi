import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Constant } from './contant';
import { Produit } from '../modeles/produit.modele';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'

})
export class ApplicationService {


  private product$ = new BehaviorSubject<any>({});
  selectedProduct$ = this.product$.asObservable();
  private arrProduits_source = new BehaviorSubject<Produit[]>([]);
  current_prodArr$ = this.arrProduits_source.asObservable();
  cartTotalSubject = new BehaviorSubject<number>(0);
  cartTotal$ = this.cartTotalSubject.asObservable();
  arraySize$ = this.arrProduits_source.pipe(
    map(dataArray => dataArray.length)
  );

  produits: Produit[] = [
    {
      id : 1,
      sku: '',
      nomComplet: 'Banane best product 3',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Banane très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit banane',
      imageUrl: './assets/best-product-3.jpg'
    },
    {
      id : 2,
      sku: '',
      nomComplet: 'Banane fruite item 3',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Banane très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit banane',
      imageUrl: './assets/fruite-item-3.jpg'
    },
    {
      id : 3,
      sku: '',
      nomComplet: 'Banane vegetable-item-3',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Banane très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit banane',
      imageUrl: './assets/vegetable-item-3.png'
    },

    {
      id : 4,
      sku: '',
      nomComplet: 'Orange best-product-1',
      prix: 400,
      nomCourt: 'Orange',
      description: 'Orange très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit orange',
      imageUrl: './assets/best-product-1.jpg'
    },
    {
      id : 5,
      sku: '',
      nomComplet: 'Orange fruite-item-1',
      prix: 300,
      nomCourt: 'Orange',
      description: 'Orange très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit orange',
      imageUrl: './assets/fruite-item-1.jpg'
    },
    {
      id : 6,
      sku: '',
      nomComplet: 'Fraise vegetable-item-1',
      prix: 500,
      nomCourt: 'Fraise',
      description: 'Fraise très mure et originaire de la Guinée-Conakry',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Fruit fraise',
      imageUrl: './assets/vegetable-item-1.jpg'
    },
    {
      id : 7,
      sku: '',
      nomComplet: 'Produit catégorie A',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Description produit catégorie',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Catégorie A',
      imageUrl: './assets/best-product-2.jpg'
    },
    {
      id : 8,
      sku: '',
      nomComplet: 'Produit catégorie AA',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Description produit catégorie',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Catégorie A',
      imageUrl: './assets/best-product-4.jpg'
    },

    {
      id : 9,
      sku: '',
      nomComplet: 'Produit catégorie AAA',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Description produit catégorie',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Catégorie A',
      imageUrl: './assets/best-product-5.jpg'
    },
    {
      id : 10,
      sku: '',
      nomComplet: 'Produit catégorie AAAA',
      prix: 500,
      nomCourt: 'Banane',
      description: 'Description produit catégorie',
      quantite:1,
      dateCreation: new Date(),
      deliveryTimeSpan: '',
      categorie: 'Catégorie A',
      imageUrl: './assets/best-product-6.jpg'
    },
];

getProducts(): any[] {
  return this.produits;
}

getSingleProduct(id:any): Produit {

  return this.produits[id];

}

getCategory(): string[] {
  let category : string[]=[];

  for(let i = 0; i < this.produits.length; i++){
    category.push(this.produits[i].categorie);
  }
  return Array.from(new Set(category));
}

getProductsByCategory(categ: any): Produit[] {

  //const prod = this.produits.find(prod => prod.id === id);
  let categoryProd : Produit[]=[];
  for(let i = 0; i < this.produits.length; i++){
    if (this.produits[i].categorie === categ) {
      categoryProd.push(this.produits[i]);
    }
    else {
      console.log("C'est pas la même catégorie")
    }
  }
  return categoryProd;
}

saveProduct(obj:any): void {
  this.produits.push(obj);
}
updateProduct(obj: any) {
  this.produits.push(obj);
}

deleteProduct(id: any): void{
  let prod = this.produits.find(prod => prod.id === id);
  if (!prod) {
    throw new Error('FaceSnap not found!');
} else {
  let index: number = this.produits.indexOf(prod);
    this.produits.splice(index,1);
}
}
setProduct(product: any) {
  this.product$.next(product);
}
addProduit(product: Produit) {
  //this.arrProduits_source.next(this.arrProduits_source.getValue().concat([data]));
  const currentItems = [...this.arrProduits_source.value];
  const index = currentItems.indexOf(product);
  if(index === -1){

    currentItems.push(product);
    this.arrProduits_source.next(currentItems);

    const newTotal = currentItems.reduce((total, item) => total + (item.prix*item.quantite), 0);
    this.cartTotalSubject.next(newTotal);
  }

}

updateQteProduct(prod:Produit, qte:number){

  const currentItems = [...this.arrProduits_source.value];
  const index = currentItems.indexOf(prod);
  if (index !== -1) {
    currentItems[index].quantite = qte;
    this.arrProduits_source.next(currentItems);
  }
  const newTotal = currentItems.reduce((total, item) => total + (item.prix*item.quantite), 0);
    this.cartTotalSubject.next(newTotal);
}

removeProduit(product: Produit) {
 /*  const ProdArr: any[] = this.arrProduits_source.getValue();

  ProdArr.forEach((item, index) => {
    if (item === data) { ProdArr.splice(index, 1); }
  });

  this.arrProduits_source.next(ProdArr); */
    const currentItems = [...this.arrProduits_source.value];
    const index = currentItems.indexOf(product);
    if (index !== -1) {
      currentItems.splice(index, 1);
      this.arrProduits_source.next(currentItems);
    }

    const newTotal = currentItems.reduce((total, item) => total + (item.prix*item.quantite), 0);
    this.cartTotalSubject.next(newTotal);
}
public saveData(prod: Produit) {
  let objectsFromStorage = localStorage.getItem("list_produits");
  if(objectsFromStorage !== null){
    this.produits = JSON.parse(objectsFromStorage);
    this.produits.push(prod);
    localStorage.setItem("list_produits", JSON.stringify(this.produits));
    window.location.reload();
  }
  else{
    this.produits.push(prod);
    localStorage.setItem("list_produits", JSON.stringify(this.produits));
    window.location.reload();
  }

}
public getData() {
  return JSON.parse(localStorage.getItem("list_produits") || '{}');
}
public removeData(key: string) {
  localStorage.removeItem(key);
}

public removeProduct(product: Produit) {
  //const fromStorage = this.getData()!;
  const objectsFromStorage = this.getData();
  console.log("Un "+objectsFromStorage.length);
  const index = objectsFromStorage.findIndex((prod:any) => prod.id === product.id);
  console.log("index "+index);
  if(index !== -1){
    objectsFromStorage.splice(index, 1);
    console.log("Deux "+objectsFromStorage.length);
    this.produits = objectsFromStorage;
    const stringToStore = JSON.stringify(this.produits);
    localStorage.setItem("list_produits",stringToStore);
    window.location.reload();
  }
}

getProductById(valueToFind : string){
  const fromStorage = this.getData() || '{}';
  const objectsFromStorage = JSON.parse(fromStorage)
  console.log(objectsFromStorage);

  var toFind = objectsFromStorage.filter(function(obj:any) {
    return obj == valueToFind;
  });

  console.log(toFind);
}

paginate(items: any[], currentPage: number, itemsPerPage: number): any[] {
  const start = (currentPage - 1) * itemsPerPage;
  //console.log('item affiches', items.slice(start, start + itemsPerPage));
  return items.slice(start, start + itemsPerPage);
}


public clearData() {
  localStorage.clear();
}
/*constructor(private http: HttpClient) { }

   getCategory() {
    return this.http.get(Constant.API_END_POINT + Constant.METHODS.GET_ALL_CATEGORY);
  }

  getProductsByCategory(id: number) {
    return this.http.get(Constant.API_END_POINT + Constant.METHODS.GET_ALL_PRODUCT_BY_CATEGORY +  id);
  }
  getProducts() {
    return this.http.get(Constant.API_END_POINT + Constant.METHODS.GET_ALL_PRODUCT);
  }
  saveProduct(obj: any) {
    return this.http.post(Constant.API_END_POINT + Constant.METHODS.CREATE_PRODUCT, obj);
  }
  updateProduct(obj: any) {
    return this.http.post(Constant.API_END_POINT + Constant.METHODS.UPDATE_PRODUCT, obj);
  }

  deleteProduct(id: any) {
    return this.http.get(Constant.API_END_POINT + Constant.METHODS.DELETE_PRODUCT + id);
  } */
}
