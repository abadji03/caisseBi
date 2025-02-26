import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogueProduitComponent } from './catalogue-produit.component';

describe('CatalogueProduitComponent', () => {
  let component: CatalogueProduitComponent;
  let fixture: ComponentFixture<CatalogueProduitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogueProduitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatalogueProduitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
