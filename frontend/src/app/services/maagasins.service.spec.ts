import { TestBed } from '@angular/core/testing';

import { MaagasinsService } from './maagasins.service';

describe('MaagasinsService', () => {
  let service: MaagasinsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaagasinsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
