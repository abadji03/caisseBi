import { Component } from '@angular/core';
import { HeaderComponent } from '../../../layout/header/header.component';
import { SidebarComponent } from '../../../layout/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, CommonModule, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  isSidebarCollapsed = false;

  onToggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
