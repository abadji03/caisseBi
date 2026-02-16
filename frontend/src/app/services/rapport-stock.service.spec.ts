import { TestBed } from '@angular/core/testing';

import { RapportStockService } from './rapport-stock.service';

describe('RapportStockService', () => {
  let service: RapportStockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RapportStockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
