import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockInventairesComponent } from './stock-inventaires.component';

describe('StockInventairesComponent', () => {
  let component: StockInventairesComponent;
  let fixture: ComponentFixture<StockInventairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockInventairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockInventairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
