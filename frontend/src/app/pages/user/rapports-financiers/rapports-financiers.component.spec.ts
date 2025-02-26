import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportsFinanciersComponent } from './rapports-financiers.component';

describe('RapportsFinanciersComponent', () => {
  let component: RapportsFinanciersComponent;
  let fixture: ComponentFixture<RapportsFinanciersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RapportsFinanciersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RapportsFinanciersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
