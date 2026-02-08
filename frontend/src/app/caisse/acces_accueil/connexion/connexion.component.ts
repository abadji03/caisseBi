import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './connexion.component.html',
  styleUrl: './connexion.component.css',
})
export class ConnexionComponent {
    
  isLoading = false;
  isActif = true;
  loginObj = {
    email: '',
    password: '',
  };
  errorMessage = '';
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  showPassword = false;
  
  togglePassword(): void {
  this.showPassword = !this.showPassword;
}
  

  onLogin(): void {

    if (!this.loginObj.email || !this.loginObj.password) {
      this.toastr.error('Tous les champs sont requis');
      return;
    } 
    this.isLoading = true; // ✅ Ajoutez ceci
    this.authService.login(this.loginObj.email, this.loginObj.password).subscribe({
      next: (result) => {
        // Redirection déjà gérée dans le service
        this.isLoading = false;
        this.isActif = result.status;
        console.log('Connexion réussie :', result.status);
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
