import { TestBed } from '@angular/core/testing';

import { RapportPDFService } from './rapport-pdf.service';

describe('RapportPDFService', () => {
  let service: RapportPDFService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RapportPDFService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
