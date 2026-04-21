import { Routes } from '@angular/router';
import { ProcessCarplate } from './process-carplate/process-carplate';
import { ViewReport } from './view-report/view-report';

export const routes: Routes = [
  { path: '', redirectTo: 'process', pathMatch: 'full' },
  { path: 'process', component: ProcessCarplate },
  { path: 'logs', component: ViewReport }
];
