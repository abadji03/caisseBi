import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FooterUserComponent } from '../footer-user/footer-user.component';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-client-order',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './client-order.component.html',
  styleUrl: './client-order.component.css'
})
export class ClientOrderComponent {

  dataArray$ = this.prodSrv.current_prodArr$;
  cartSize$ = this.prodSrv.arraySize$;
  cartTotal$ = this.prodSrv.cartTotal$;

  constructor(private prodSrv:ApplicationService,private router:Router) {

  }


}
