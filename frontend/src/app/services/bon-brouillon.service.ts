import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Bon } from '../modeles/bon.model';
import { Panier } from '../modeles/panier.model';

@Injectable({
  providedIn: 'root'
})
export class BonBrouillonService {

  //constructor() { }
  private bonBrouillonSubject = new BehaviorSubject<Bon | null>(null);
  private panierBrouillonSubject = new BehaviorSubject<Panier | null>(null);

  bonBrouillon$ = this.bonBrouillonSubject.asObservable();
  panierBrouillon$ = this.panierBrouillonSubject.asObservable();

  setBonBrouillon(bon: Bon|null): void {
    this.bonBrouillonSubject.next(bon);
  }

  setPanierBrouillon(panier: Panier|null): void {
    this.panierBrouillonSubject.next(panier);
  }

  getBonBrouillon(): Bon | null {
    return this.bonBrouillonSubject.value;
  }

  getPanierBrouillon(): Panier | null {
    return this.panierBrouillonSubject.value;
  }

  clearBrouillons(): void {
    this.bonBrouillonSubject.next(null);
    this.panierBrouillonSubject.next(null);
  }
}
