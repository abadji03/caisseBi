import { TestBed } from '@angular/core/testing';

import { HistoriqueStatutBonService } from './historique-statut-bon.service';

describe('HistoriqueStatutBonService', () => {
  let service: HistoriqueStatutBonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistoriqueStatutBonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
