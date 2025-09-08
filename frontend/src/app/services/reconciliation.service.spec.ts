import { TestBed } from '@angular/core/testing';

import { ReconciliationService } from './reconciliation.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReconciliationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
