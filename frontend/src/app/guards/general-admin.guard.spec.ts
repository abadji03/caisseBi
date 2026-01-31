import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { generalAdminGuard } from './general-admin.guard';

describe('generalAdminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => generalAdminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
