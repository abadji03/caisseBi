import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../layout/header/header.component';
import { SidebarComponent } from '../../../layout/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  isSidebarCollapsed = false;
  private authService = inject(AuthService);
  

 // Dans votre composant ou service
ngOnInit() {
  this.authService.currentUser.subscribe(user => {
    console.log('=== DEBUG UTILISATEUR ===');
    console.log('Utilisateur:', user.nom);
    console.log('Rôles:', user.roles?.map(r => r.nom));
    console.log('Permissions totales:', 
      user.roles?.flatMap(r => r.permissions?.map(p => p.nom))
    );
    console.log('=== FIN DEBUG ===');
  });
}

  onToggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
