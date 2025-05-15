import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer-user',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './footer-user.component.html',
  styleUrl: './footer-user.component.css'
})
export class FooterUserComponent {

}
