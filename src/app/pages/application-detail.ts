import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { LoanApi } from '../core/loan-api';
import { Assessment } from '../core/models';
import { parseReason } from '../core/scoring';
import { StatusBadge } from '../shared/status-badge';

type Loaded = { app: Assessment } | { error: string };

@Component({
  selector: 'app-application-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, StatusBadge],
  template: `
    <p><a routerLink="/applications">← All applications</a></p>
    @if (state(); as s) {
      @if ('app' in s) {
        <div class="toolbar" style="justify-content: space-between">
          <div>
            <h1>{{ s.app.applicantName }}</h1>
            <p class="subtitle" style="margin: 0">Application #{{ s.app.id }} · {{ s.app.createdAt | date: 'medium' }}</p>
          </div>
          <app-status-badge [status]="s.app.status" />
        </div>
        <div class="grid kpis" style="margin-top: 16px">
          <div class="card"><div class="kpi-label">Product</div><div class="kpi-value">{{ s.app.productCode }}</div></div>
          <div class="card"><div class="kpi-label">Amount</div><div class="kpi-value">{{ s.app.amount | currency: 'USD' : 'symbol' : '1.0-0' }}</div></div>
          <div class="card"><div class="kpi-label">Monthly payment</div><div class="kpi-value">{{ s.app.monthlyPayment | currency: 'USD' }}</div><div class="kpi-note">over {{ s.app.termMonths }} months</div></div>
          <div class="card"><div class="kpi-label">Score</div><div class="kpi-value">{{ s.app.score }}</div><div class="kpi-note">out of 100</div></div>
        </div>
        <div class="card">
          <h2>Why this decision</h2>
          <table>
            <thead><tr><th>Rule</th><th>Result</th><th>Reason</th></tr></thead>
            <tbody>
              @for (r of reasons(); track $index) {
                <tr>
                  <td>{{ r.rule }}</td>
                  <td><span class="badge" [class.ok]="r.outcome === 'PASS'" [class.warn]="r.outcome === 'REVIEW'" [class.bad]="r.outcome === 'FAIL'">{{ r.outcome }}</span></td>
                  <td>{{ r.message }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card empty">{{ s.error }}</div>
      }
    } @else {
      <div class="card empty">Loading…</div>
    }
  `,
})
export class ApplicationDetailPage {
  private readonly api = inject(LoanApi);
  /** Bound from the :id route parameter (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly state = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) =>
        this.api.get(Number(id)).pipe(
          map((app): Loaded => ({ app })),
          catchError((e: Error) => of<Loaded>({ error: e.message })),
        ),
      ),
    ),
  );
  protected readonly reasons = computed(() => {
    const s = this.state();
    return s && 'app' in s ? s.app.reasons.map(parseReason) : [];
  });
}
