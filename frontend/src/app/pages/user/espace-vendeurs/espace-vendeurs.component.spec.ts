import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EspaceVendeursComponent } from './espace-vendeurs.component';

describe('EspaceVendeursComponent', () => {
  let component: EspaceVendeursComponent;
  let fixture: ComponentFixture<EspaceVendeursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EspaceVendeursComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EspaceVendeursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
