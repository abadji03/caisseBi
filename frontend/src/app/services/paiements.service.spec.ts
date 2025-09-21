import { TestBed } from '@angular/core/testing';

import { PaiementsService } from './paiements.service';

describe('PaiementsService', () => {
  let service: PaiementsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaiementsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
