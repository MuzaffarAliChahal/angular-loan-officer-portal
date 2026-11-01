import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Dashboard · Loan Officer Portal', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
  { path: 'apply', title: 'New application · Loan Officer Portal', loadComponent: () => import('./pages/apply').then((m) => m.ApplyPage) },
  { path: 'applications', title: 'Applications · Loan Officer Portal', loadComponent: () => import('./pages/applications').then((m) => m.ApplicationsPage) },
  { path: 'applications/:id', title: 'Application · Loan Officer Portal', loadComponent: () => import('./pages/application-detail').then((m) => m.ApplicationDetailPage) },
  { path: 'products', title: 'Products · Loan Officer Portal', loadComponent: () => import('./pages/products').then((m) => m.ProductsPage) },
  { path: '**', redirectTo: '' },
];
