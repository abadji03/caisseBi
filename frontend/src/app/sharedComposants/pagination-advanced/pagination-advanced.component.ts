import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination-advanced',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination-advanced.component.html',
  styleUrl: './pagination-advanced.component.css'
})
export class PaginationAdvancedComponent {

  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems = 0;
  @Input() itemsPerPage = 20;
  
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  
  private _limit = 20;
  
  @Input()
  get limit(): number {
    return this._limit;
  }
  set limit(value: number) {
    this._limit = value;
  }
  
  get startItem(): number {
    return (this.currentPage - 1) * this.limit + 1;
  }
  
  get endItem(): number {
    return Math.min(this.currentPage * this.limit, this.totalItems);
  }
  
  onPageChange(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }
  
  onLimitChange(): void {
    this.limitChange.emit(this.limit);
  }
  
  goToPage(page: number | string): void {
    let pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum)) pageNum = 1;
    pageNum = Math.max(1, Math.min(pageNum, this.totalPages));
    if (pageNum !== this.currentPage) {
      this.pageChange.emit(pageNum);
    }
  }
}
