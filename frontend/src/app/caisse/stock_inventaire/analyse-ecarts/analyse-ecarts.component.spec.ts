import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyseEcartsComponent } from './analyse-ecarts.component';

describe('AnalyseEcartsComponent', () => {
  let component: AnalyseEcartsComponent;
  let fixture: ComponentFixture<AnalyseEcartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyseEcartsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AnalyseEcartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
