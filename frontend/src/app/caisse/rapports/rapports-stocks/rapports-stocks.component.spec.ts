import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportsStocksComponent } from './rapports-stocks.component';

describe('RapportsStocksComponent', () => {
  let component: RapportsStocksComponent;
  let fixture: ComponentFixture<RapportsStocksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RapportsStocksComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RapportsStocksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
