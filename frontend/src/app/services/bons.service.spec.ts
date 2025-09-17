import { TestBed } from '@angular/core/testing';

import { BonsService } from './bons.service';

describe('BonsService', () => {
  let service: BonsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BonsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
