import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessCarplate } from './process-carplate';

describe('ProcessCarplate', () => {
  let component: ProcessCarplate;
  let fixture: ComponentFixture<ProcessCarplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessCarplate],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessCarplate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
