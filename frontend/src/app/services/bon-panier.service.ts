import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Panier } from '../modeles/panier.model';

@Injectable({
  providedIn: 'root'
})
export class BonPanierService {

  private panierSubject = new BehaviorSubject<Panier | null>(null);
  panier$ = this.panierSubject.asObservable();
  
  setPanier(panier: Panier): void {
    this.panierSubject.next(panier);
  }
  
  getPanier(): Panier | null {
    return this.panierSubject.getValue();
  }
  
  clearPanier(): void {
    this.panierSubject.next(null);
  }
}
