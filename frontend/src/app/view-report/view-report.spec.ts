import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewReport } from './view-report';

describe('ViewReport', () => {
  let component: ViewReport;
  let fixture: ComponentFixture<ViewReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewReport],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
