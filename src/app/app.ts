import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoanApi } from './core/loan-api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  protected readonly mode = inject(LoanApi).mode;
  protected readonly nav = [
    { path: '/', label: 'Dashboard', exact: true },
    { path: '/apply', label: 'New application', exact: false },
    { path: '/applications', label: 'Applications', exact: false },
    { path: '/products', label: 'Loan products', exact: false },
  ];
}
