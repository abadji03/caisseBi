import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './connexion.component.html',
  styleUrl: './connexion.component.css',
})
export class ConnexionComponent {
  loginObj = {
    email: '',
    password: '',
  };
  errorMessage = '';
  //private router = inject(Router);
  private authService = inject(AuthService);
  //private roleService = inject(RolePermissionsService);

  /* onLogin() {
    this.authService.login(this.loginObj.email, this.loginObj.password).subscribe({
      next: (res) => {
        const role = res.user.role;
        if (role === 'admin_general') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'admin_structure') {
          this.router.navigate(['/admin-structure/dashboard']);
        } else {
          this.router.navigate(['/espace-vendeurs/overview']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Erreur lors de la connexion';
        console.log('Erreur lors de la connexion',err.error.message)
      }
    });
  } */

  onLogin(): void {
    if (!this.loginObj.email || !this.loginObj.password) return;

    this.authService.login(this.loginObj.email, this.loginObj.password).subscribe({
      next: () => {
        // Redirection déjà gérée dans le service
      },
      error: (err) => {
        console.error('Erreur de connexion :', err);
        alert('Email ou mot de passe incorrect');
      },
    });
  }
}
