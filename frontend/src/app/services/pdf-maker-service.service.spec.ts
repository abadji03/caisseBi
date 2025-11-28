import { TestBed } from '@angular/core/testing';

import { PdfMakerServiceService } from './pdf-maker-service.service';

describe('PdfMakerServiceService', () => {
  let service: PdfMakerServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfMakerServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
