import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeBonsComponent } from './liste-bons.component';

describe('ListeBonsComponent', () => {
  let component: ListeBonsComponent;
  let fixture: ComponentFixture<ListeBonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeBonsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListeBonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
