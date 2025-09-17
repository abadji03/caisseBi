import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-row-page-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './row-page-selector.component.html',
  styleUrl: './row-page-selector.component.css'
})
export class RowPageSelectorComponent {

  @Input() rowsPerPageOptions: number[] = [5, 10, 20, 50];
  @Input() rowsPerPage = 10;
  @Output() rowsPerPageChange = new EventEmitter<number>();

  onRowsPerPageChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.rowsPerPageChange.emit(value);
  }
}
