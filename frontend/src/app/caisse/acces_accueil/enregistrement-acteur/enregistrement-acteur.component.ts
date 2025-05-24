import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterOutlet } from '@angular/router';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-enregistrement-acteur',
  standalone: true,
  imports: [RouterOutlet,CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './enregistrement-acteur.component.html',
  styleUrl: './enregistrement-acteur.component.css'
})
export class EnregistrementActeurComponent {

  userRegister: FormGroup;
  userLogin: FormGroup;
  acteursList = ['Producteur', 'Artisan', 'Entreprise', 'Vendeur simple', 'Autre'];
  accountExists: boolean = false;
  showPassword = false;


  constructor(public userService: UserService, private router: Router) {

    this.userLogin = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });

    this.userRegister = new FormGroup({
      nom: new FormControl('', Validators.required),
      prenom: new FormControl('', Validators.required),
      telephone: new FormControl('', [Validators.required, Validators.pattern('^[0-9]*$')]),
      adresse: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', Validators.required),
      type_user: new FormControl('', Validators.required),
    }, this.validerpassWord);
  }

   togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  validerpassWord(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
  }

  onSubmitUserRegister() {
    if (this.userRegister.valid) {
      console.log('Données soumises :', this.userRegister.value);

      // Réinitialisation de l'état d'erreur avant la soumission
    this.accountExists = false;

    // Vérification si l'email existe déjà avant de créer le compte
    /* this.userService.findUserWithEmail(this.userRegister.get('email')?.value).subscribe({
      next: (res: any) => {

        console.log('Données teste :', this.userRegister.value);
        // Si l'API renvoie une réponse indiquant que l'email existe
        // Vous pouvez ici vérifier si la réponse contient l'information indiquant
        // que l'email est déjà pris (par exemple, avec un code spécifique)
        // Si la réponse signifie que l'email existe déjà
        if (res) {  // Vérifier si la réponse contient des données utilisateur (email existant)
          this.accountExists = true;  // Afficher le message d'erreur
        } else {
          // Si l'email n'existe pas, procéder à la création du compte
          this.createAccount();
        }
      },
      error: (err: any) => {
        // Gestion des erreurs de l'appel API
        console.error('Erreur lors de la vérification de l\'email:', err);
      }
    }); */

   /*    this.userService.create(this.userRegister.value).subscribe((res:any) => {


        console.log('Votre compte a été crée avec succès!');

        this.userRegister.reset();

        //this.router.navigateByUrl('post/index');

   }) */
    } else {
      console.log('Le formulaire n\'est pas valide');
    }
  }

  createAccount() {
    // Soumission des données pour créer le compte
    this.userService.create(this.userRegister.value).subscribe({
      next: (res: any) => {
        console.log('Votre compte a été créé avec succès!');
        this.userRegister.reset();
        // Vous pouvez rediriger l'utilisateur ou faire d'autres actions ici
        // Par exemple : this.router.navigateByUrl('post/index');
      },
      error: (err: any) => {
        console.error('Une erreur est survenue lors de la création du compte', err);
      }
    });
  }

  onSubmitLogin() {
    if (this.userLogin.valid) {
      console.log(this.userLogin.value);
    } else {
      console.log("Formulaire invalide");
    }
  }

}
