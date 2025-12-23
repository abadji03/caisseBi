import { TestBed } from '@angular/core/testing';

import { PanierManagerService } from './panier-manager.service';

describe('PanierManagerService', () => {
  let service: PanierManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanierManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
