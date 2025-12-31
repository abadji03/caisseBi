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
    //return this.panierBrouillonSubject.value;
    // Retourne toujours une COPIE pour éviter les mutations accidentelles
    const panier = this.panierBrouillonSubject.value;
    return panier ? panier.clone() : null;
  }

  clearBrouillons(): void {
    this.bonBrouillonSubject.next(null);
    this.panierBrouillonSubject.next(null);
  }

  // Nouvelle méthode pour mettre à jour le panier de façon centralisée
  updatePanier(panier: Panier): void {
    // Toujours cloner le panier pour éviter les références partagées
    this.panierBrouillonSubject.next(panier.clone());
  }
}
