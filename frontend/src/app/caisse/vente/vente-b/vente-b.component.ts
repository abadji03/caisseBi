import { Component, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ApplicationService } from '../../../services/application.service';
import { CommonModule } from '@angular/common';
import { Produit } from '../../../modeles/produit.modele';
import { MatIconModule } from '@angular/material/icon';

interface AutoCompleteCompleteEvent {
    originalEvent: Event;
    query: string;
}

@Component({
  selector: 'app-vente-b',
  standalone: true,
  imports: [ReactiveFormsModule, AutoCompleteModule, FormsModule, CommonModule, MatIconModule],
  templateUrl: './vente-b.component.html',
  styleUrl: './vente-b.component.css'
})
export class VenteBComponent {

  countries !: any[];

  selectedCountry: any;

  filteredCountries !: any[];

  productList: Produit[]=[];

  vente_simple: boolean = false;
  showFacture: boolean = false;


  dataArray$ = this.prdSer.current_prodArr$;
  cartSize$ = this.prdSer.arraySize$;
  cartTotal$ = this.prdSer.cartTotal$;

  constructor(private prdSer: ApplicationService) {}

  ngOnInit() {

    this.countries = this.prdSer.getProducts();
    this.productList = this.prdSer.getProducts();

  }

  setModeVente(){
    const btnM = document.getElementById("btnMode") as HTMLButtonElement;
    if( this.vente_simple){
      this.vente_simple = false;
      btnM.textContent = "Vente simple"
    }
    else {
      this.vente_simple = true;
      btnM.textContent = "Vente sémi-automatique"
    }
  }

  voireFacture(){
    const btnRecu = document.getElementById("btnR") as HTMLButtonElement;
    if(!this.showFacture) {
      this.showFacture = true;
      btnRecu.textContent = "Masquer la facture"
    }
    else {
      this.showFacture = false;
      btnRecu.textContent = "Visualiser la Facture"
    }
  }

  filterCountry(event: AutoCompleteCompleteEvent) {
    let filtered: any[] = [];
    let query = event.query;

    for (let i = 0; i < (this.countries as any[]).length; i++) {
        let country = (this.countries as any[])[i];
        if (country.nomComplet.toLowerCase().indexOf(query.toLowerCase()) == 0) {
            filtered.push(country);
        }
    }

    this.filteredCountries = filtered;
}
}
