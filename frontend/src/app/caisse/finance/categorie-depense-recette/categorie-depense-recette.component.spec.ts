import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategorieDepenseRecetteComponent } from './categorie-depense-recette.component';

describe('CategorieDepenseRecetteComponent', () => {
  let component: CategorieDepenseRecetteComponent;
  let fixture: ComponentFixture<CategorieDepenseRecetteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorieDepenseRecetteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategorieDepenseRecetteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
