import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { TitreService } from '../../services/titre.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{
    
  @Output() toggleSidebar = new EventEmitter<void>();
  titre = 'Accueil';
  sousTitre = 'Vue d’ensemble';
  private titreService = inject(TitreService);

  ngOnInit(): void {
    this.titreService.titre$.subscribe(({ titre, sousTitre }) => {
      this.titre = titre;
      this.sousTitre = sousTitre;
    });
  }

  toggleSidebarMenu(): void {
    this.toggleSidebar.emit();
  }
}
