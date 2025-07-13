import { TestBed } from '@angular/core/testing';

import { MouvementsStockService } from './mouvements-stock.service';

describe('MouvementsStockService', () => {
  let service: MouvementsStockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MouvementsStockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
