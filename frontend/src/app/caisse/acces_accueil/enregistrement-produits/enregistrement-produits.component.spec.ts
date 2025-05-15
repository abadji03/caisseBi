import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnregistrementProduitsComponent } from './enregistrement-produits.component';

describe('EnregistrementProduitsComponent', () => {
  let component: EnregistrementProduitsComponent;
  let fixture: ComponentFixture<EnregistrementProduitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnregistrementProduitsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EnregistrementProduitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
