import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FooterUserComponent } from '../footer-user/footer-user.component';

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './user-account.component.html',
  styleUrl: './user-account.component.css'
})
export class UserAccountComponent {

}
