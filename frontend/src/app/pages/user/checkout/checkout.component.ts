import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { ApplicationService } from '../../../services/application.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, FooterUserComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {
  
  dataArray$ = this.prodSrv.current_prodArr$;
  cartSize$ = this.prodSrv.arraySize$;
  cartTotal$ = this.prodSrv.cartTotal$;

  constructor(private prodSrv:ApplicationService,private router:Router) {

  }

  onNavigateToOrderClient(){

    this.router.navigate(['/client-order'])
  }

}
