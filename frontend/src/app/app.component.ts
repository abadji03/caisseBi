import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { LandingComponent } from './pages/user/landing/landing.component';
import { FooterUserComponent } from './pages/user/footer-user/footer-user.component';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [CommonModule, RouterOutlet, FooterUserComponent, RouterModule]
})
export class AppComponent {
  title = 'frontend';
}
