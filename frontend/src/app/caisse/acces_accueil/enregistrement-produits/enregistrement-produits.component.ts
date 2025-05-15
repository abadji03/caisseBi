import { Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { Produit } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-enregistrement-produits',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './enregistrement-produits.component.html',
  styleUrl: './enregistrement-produits.component.css'
})
export class EnregistrementProduitsComponent {

  
  isSidePanelVisible: boolean= false;
  capturingPicture : boolean = false;
  fileName = '';
  localUrl!: any[];
  listeProduits:Produit[] = [];
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild("canvas") canvas!: ElementRef;
  public captures!: Array<any>;

  productObj: Produit = {
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
  containers : any[]= [];
  constructor(@Inject(PLATFORM_ID) private _platform: Object,private productSrv: ApplicationService) {
    this.captures = [];
  }
  ngOnInit(): void {
  
  }

  add() {
    const inputEl = document.getElementById('div-input') as HTMLDivElement;
    this.containers.push(inputEl);
  }
  
  removeDivEl(el: any){
    const index = this.containers.indexOf(el);
    if(index !== -1){
      this.containers.splice(index, 1);
    }
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



onStart(){
  if(isPlatformBrowser(this._platform) && 'mediaDevices' in navigator) {
    navigator.mediaDevices.getUserMedia({video: true}).then((ms: MediaStream) => {
      const _video = this.video.nativeElement;
      _video.srcObject = ms;
      _video.play(); 
      
    });
  }
}

onStop() {
  this.video.nativeElement.pause();
  (this.video.nativeElement.srcObject as MediaStream).getVideoTracks()[0].stop();
  this.video.nativeElement.srcObject = null;
  this.capturingPicture = false;
}

ngOnDestroy() {
  (this.video.nativeElement.srcObject as MediaStream).getVideoTracks()[0].stop();
}

public capture() {
  var context = this.canvas.nativeElement.getContext("2d").drawImage(this.video.nativeElement, 0, 0, 640, 480);
  this.captures.push(this.canvas.nativeElement.toDataURL("image/png"));
}

openPanelVideo(){
  this.capturingPicture = true;
  this.onStart();
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
