import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { PaginationControlsComponent } from '../pagination-controls/pagination-controls.component';
import { RowPageSelectorComponent } from '../row-page-selector/row-page-selector.component';

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [ CommonModule,
    SearchBarComponent,
    PaginationControlsComponent,
    RowPageSelectorComponent],
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.css'
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenericTableComponent<T  extends Record<string, any>> {

  @Input() data: T[] = [];
  @Input() columns: { key: string; label: string }[] = [];
  //@Input() currentPage = 1;
  private _currentPage = 1;
  @Input()
  get currentPage(): number {
    return this._currentPage;
  }
  set currentPage(value: number) {
    this._currentPage = value;
    this.currentPageChange.emit(this._currentPage);
  }
  @Input() rowsPerPage = 10;
  @Input() searchQuery = '';
  @Input() placeholder = 'Rechercher...';
  @Output() currentPageChange = new EventEmitter<number>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() rowsPerPageChange = new EventEmitter<number>();
  @Output() searchQueryChange = new EventEmitter<string>();

  get totalPages(): number {
    return Math.ceil(this.data.length / this.rowsPerPage);
  }

  get paginatedData(): T[] {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    return this.data.slice(startIndex, startIndex + this.rowsPerPage);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onRowsPerPageChange(rowsPerPage: number): void {
    this.rowsPerPageChange.emit(rowsPerPage);
    this.currentPage = 1;
  }

  onSearchQueryChange(query: string): void {
    this.searchQueryChange.emit(query);
    this.currentPage = 1;
  }
}
