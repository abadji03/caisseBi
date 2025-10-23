import { TestBed } from '@angular/core/testing';

import { BonBrouillonService } from './bon-brouillon.service';

describe('BonBrouillonService', () => {
  let service: BonBrouillonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BonBrouillonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
