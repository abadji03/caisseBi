import { TestBed } from '@angular/core/testing';

import { TransfertsService } from './transferts.service';

describe('TransfertsService', () => {
  let service: TransfertsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransfertsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
