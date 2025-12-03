import { TestBed } from '@angular/core/testing';

import { CategoriesDepencesRecettesService } from './categories-depences-recettes.service';

describe('CategoriesDepencesRecettesService', () => {
  let service: CategoriesDepencesRecettesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoriesDepencesRecettesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
