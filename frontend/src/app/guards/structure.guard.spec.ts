import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { structureGuard } from './structure.guard';

describe('structureGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => structureGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
