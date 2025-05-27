import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [RouterOutlet,CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css'
})
export class UserLoginComponent {
 
  userLogin: FormGroup;
  userRegister: FormGroup;

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
    }, this.validerpassWord);
  }

  validerpassWord(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
  }

  onSubmitUserRegister() {
    if (this.userRegister.valid) {
      console.log('Données soumises :', this.userRegister.value);
      this.userService.create(this.userRegister.value).subscribe((res:any) => {

        console.log('Votre compte a été crée avec succès!');

        this.userRegister.reset();

        //this.router.navigateByUrl('post/index');

   })
    } else {
      console.log('Le formulaire n\'est pas valide');
    }
  }

  onSubmitLogin() {
    if (this.userLogin.valid) {
      console.log(this.userLogin.value);
    } else {
      console.log("Formulaire invalide");
    }
  }

  /**

   * Write code on Method

   *

   * @return response()

   */

 /*  get formLogin(){

    return this.userLogin.controls;

  }

  get formRegister(){

    return this.userRegister.controls;

  } */

}
