import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecettesComponent } from './recettes.component';

describe('RecettesComponent', () => {
  let component: RecettesComponent;
  let fixture: ComponentFixture<RecettesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecettesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RecettesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
