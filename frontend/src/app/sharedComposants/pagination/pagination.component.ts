import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems?: number;
  @Input() maxVisiblePages = 5;
  
  @Output() pageChange = new EventEmitter<number>();
  
  get visiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(2, this.currentPage - Math.floor(this.maxVisiblePages / 2));
    const end = Math.min(this.totalPages - 1, start + this.maxVisiblePages - 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
  
  get showFirst(): boolean {
    return this.totalPages > 1 && this.currentPage > 3;
  }
  
  get showLast(): boolean {
    return this.totalPages > 1 && this.currentPage < this.totalPages - 2;
  }
  
  get showStartDots(): boolean {
    return this.currentPage > 3 && this.totalPages > this.maxVisiblePages;
  }
  
  get showEndDots(): boolean {
    return this.currentPage < this.totalPages - 2 && this.totalPages > this.maxVisiblePages;
  }
  
  onPageChange(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }
}
