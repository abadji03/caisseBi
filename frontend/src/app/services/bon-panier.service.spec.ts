import { TestBed } from '@angular/core/testing';

import { BonPanierService } from './bon-panier.service';

describe('BonPanierService', () => {
  let service: BonPanierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BonPanierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
