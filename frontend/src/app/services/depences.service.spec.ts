import { TestBed } from '@angular/core/testing';

import { DepencesService } from './depences.service';

describe('DepencesService', () => {
  let service: DepencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepencesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
