import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [],
  templateUrl: './pagination-controls.component.html',
  styleUrl: './pagination-controls.component.css'
})
export class PaginationControlsComponent {

  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() disabled = false;
  @Output() pageChange = new EventEmitter<number>();

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}
