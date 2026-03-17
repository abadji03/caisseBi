import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeVersementsComponent } from './liste-versements.component';

describe('ListeVersementsComponent', () => {
  let component: ListeVersementsComponent;
  let fixture: ComponentFixture<ListeVersementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeVersementsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListeVersementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
