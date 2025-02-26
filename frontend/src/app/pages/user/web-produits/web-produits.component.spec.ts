import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebProduitsComponent } from './web-produits.component';

describe('WebProduitsComponent', () => {
  let component: WebProduitsComponent;
  let fixture: ComponentFixture<WebProduitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebProduitsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WebProduitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
