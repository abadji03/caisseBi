import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaiementsComponent } from './paiements.component';

describe('PaiementsComponent', () => {
  let component: PaiementsComponent;
  let fixture: ComponentFixture<PaiementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaiementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
