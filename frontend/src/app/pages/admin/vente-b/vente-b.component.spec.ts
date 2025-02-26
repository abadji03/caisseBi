import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenteBComponent } from './vente-b.component';

describe('VenteBComponent', () => {
  let component: VenteBComponent;
  let fixture: ComponentFixture<VenteBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenteBComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VenteBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
