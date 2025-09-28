import { TestBed } from '@angular/core/testing';

import { ArticlesPanierService } from './articles-panier.service';

describe('ArticlesPanierService', () => {
  let service: ArticlesPanierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArticlesPanierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
