import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { LoanApi } from '../core/loan-api';
import { ApplicationStatus, STATUSES } from '../core/models';
import { StatusBadge, statusLabel } from '../shared/status-badge';

@Component({
  selector: 'app-applications',
  imports: [CurrencyPipe, DatePipe, FormsModule, StatusBadge],
  template: `
    <h1>Applications</h1>
    <p class="subtitle">The 50 most recent decisions. Filtering by status is done by the API.</p>

    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder="Search applicant…" [ngModel]="query()" (ngModelChange)="query.set($event)" aria-label="Search applicant" />
        <select [ngModel]="status()" (ngModelChange)="status.set($event)" aria-label="Filter by status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ label(s) }}</option> }
        </select>
        <span class="hint">{{ filtered().length }} shown</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Applicant</th><th>Product</th><th class="num">Amount</th><th class="num">Term</th><th class="num">Monthly</th><th class="num">Score</th><th>Status</th><th>Submitted</th></tr>
          </thead>
          <tbody>
            @for (a of filtered(); track a.id) {
              <tr class="clickable" (click)="open(a.id)">
                <td>{{ a.id }}</td>
                <td>{{ a.applicantName }}</td>
                <td>{{ a.productCode }}</td>
                <td class="num">{{ a.amount | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
                <td class="num">{{ a.termMonths }} mo</td>
                <td class="num">{{ a.monthlyPayment | currency: 'USD' }}</td>
                <td class="num">{{ a.score }}</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td>{{ a.createdAt | date: 'MMM d, HH:mm' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">No applications match.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ApplicationsPage {
  private readonly api = inject(LoanApi);
  private readonly router = inject(Router);

  protected readonly statuses = STATUSES;
  protected readonly label = statusLabel;
  protected readonly query = signal('');
  protected readonly status = signal<ApplicationStatus | ''>('');

  private readonly apps = toSignal(
    toObservable(this.status).pipe(switchMap((s) => this.api.recent(s || undefined))),
    { initialValue: [] },
  );
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.apps().filter((a) => !q || a.applicantName.toLowerCase().includes(q));
  });

  protected open(id: number) {
    this.router.navigate(['/applications', id]);
  }
}
