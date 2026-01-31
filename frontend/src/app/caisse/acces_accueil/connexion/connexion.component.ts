import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './connexion.component.html',
  styleUrl: './connexion.component.css',
})
export class ConnexionComponent {
    
  isLoading = false;
  loginObj = {
    email: '',
    password: '',
  };
  errorMessage = '';
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  
  

  onLogin(): void {
    if (!this.loginObj.email || !this.loginObj.password) {
      this.toastr.error('Tous les champs sont requis');
      return;
    } 

    this.authService.login(this.loginObj.email, this.loginObj.password).subscribe({
      next: () => {
        // Redirection déjà gérée dans le service
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur de connexion :', err.error?.message);
        this.errorMessage = err.error?.message || 'Email ou mot de passe incorrec'
        this.toastr.error(this.errorMessage);
        //alert('Email ou mot de passe incorrect');
      },
    });
  }
}
