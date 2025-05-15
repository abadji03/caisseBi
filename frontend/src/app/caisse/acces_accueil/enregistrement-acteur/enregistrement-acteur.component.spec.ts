import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnregistrementActeurComponent } from './enregistrement-acteur.component';

describe('EnregistrementActeurComponent', () => {
  let component: EnregistrementActeurComponent;
  let fixture: ComponentFixture<EnregistrementActeurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnregistrementActeurComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EnregistrementActeurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
