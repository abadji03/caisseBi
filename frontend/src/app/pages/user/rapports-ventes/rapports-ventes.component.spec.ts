import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportsVentesComponent } from './rapports-ventes.component';

describe('RapportsVentesComponent', () => {
  let component: RapportsVentesComponent;
  let fixture: ComponentFixture<RapportsVentesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RapportsVentesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportsVentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
