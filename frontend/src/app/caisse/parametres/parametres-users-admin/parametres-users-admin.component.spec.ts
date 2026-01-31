import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametresUsersAdminComponent } from './parametres-users-admin.component';

describe('ParametresUsersAdminComponent', () => {
  let component: ParametresUsersAdminComponent;
  let fixture: ComponentFixture<ParametresUsersAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresUsersAdminComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ParametresUsersAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
