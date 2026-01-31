import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css'
})
export class UnauthorizedComponent {

  private router = inject(Router);
  private authService = inject(AuthService);

  goBack(): void {
    this.router.navigate(['/caisse-bi/overview']);
  }

  logout(): void {
    this.authService.logout();
  }
}
