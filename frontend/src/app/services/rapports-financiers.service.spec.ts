import { TestBed } from '@angular/core/testing';

import { RapportsFinanciersService } from './rapports-financiers.service';

describe('RapportsFinanciersService', () => {
  let service: RapportsFinanciersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RapportsFinanciersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
