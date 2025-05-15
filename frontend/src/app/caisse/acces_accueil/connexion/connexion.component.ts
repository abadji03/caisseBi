import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl,FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './connexion.component.html',
  styleUrl: './connexion.component.css'
})
export class ConnexionComponent {

  loginObj: any = {
    userName: '',
    password: ''
  };
  constructor(private router: Router){}

  onLogin() {
    if(this.loginObj.userName == "admin" && this.loginObj.password == "334455") {
      this.router.navigateByUrl('/produits')

    } else {
      alert('Wrong Credentials')
    }
  }
  
}
