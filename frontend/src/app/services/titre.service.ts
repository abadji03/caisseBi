import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TitreService {

  private titreSubject = new BehaviorSubject<{ titre: string; sousTitre: string }>({
    titre: 'Accueil',
    sousTitre: 'Vue d’ensemble',
  });

  titre$ = this.titreSubject.asObservable();

  setTitre(titre: string, sousTitre: string): void {
    this.titreSubject.next({ titre, sousTitre });
  }
  getCurrentTitre() {
    return this.titreSubject.value;
  }
  //constructor() { }
}
