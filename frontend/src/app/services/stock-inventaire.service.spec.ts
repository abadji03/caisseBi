import { TestBed } from '@angular/core/testing';

import { StockInventaireService } from './stock-inventaire.service';

describe('StockInventaireService', () => {
  let service: StockInventaireService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockInventaireService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
