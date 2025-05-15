import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanierClientComponent } from './panier-client.component';

describe('PanierClientComponent', () => {
  let component: PanierClientComponent;
  let fixture: ComponentFixture<PanierClientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanierClientComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PanierClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
