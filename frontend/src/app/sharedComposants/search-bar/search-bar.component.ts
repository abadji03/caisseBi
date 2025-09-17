import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {

  @Input() placeholder = 'Rechercher...';
  @Input() searchQuery = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  onSearchChange(): void {
    this.searchQueryChange.emit(this.searchQuery);
  }
}
