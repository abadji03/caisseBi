import { TestBed } from '@angular/core/testing';

import { KpiCaisseService } from './kpi-caisse.service';

describe('KpiCaisseService', () => {
  let service: KpiCaisseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KpiCaisseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
