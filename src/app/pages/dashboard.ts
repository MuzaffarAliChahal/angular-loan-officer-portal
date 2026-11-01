import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { LoanApi } from '../core/loan-api';
import { STATUSES } from '../core/models';
import { StatusBadge, statusLabel, statusTone } from '../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, StatusBadge],
  template: `
    <h1>Dashboard</h1>
    <p class="subtitle">Decisions from the rules engine: credit score, debt-to-income, loan-to-value and product limits.</p>

    @if (apps(); as list) {
      <div class="grid kpis">
        <div class="card"><div class="kpi-label">Applications</div><div class="kpi-value">{{ list.length }}</div><div class="kpi-note">most recent 50</div></div>
        <div class="card"><div class="kpi-label">Approval rate</div><div class="kpi-value">{{ approvalRate() | number: '1.0-0' }}%</div><div class="kpi-note">approved / all decisions</div></div>
        <div class="card"><div class="kpi-label">Average score</div><div class="kpi-value">{{ avgScore() | number: '1.0-0' }}</div><div class="kpi-note">0–100, higher is safer</div></div>
        <div class="card"><div class="kpi-label">Approved volume</div><div class="kpi-value">{{ approvedVolume() | currency: 'USD' : 'symbol' : '1.0-0' }}</div><div class="kpi-note">principal approved</div></div>
      </div>

      <div class="grid two-col">
        <div class="card">
          <h2>Decisions by status</h2>
          <div class="bars">
            @for (row of byStatus(); track row.status) {
              <div class="bar-row">
                <span>{{ row.label }}</span>
                <div class="bar-track"><div class="bar-fill" [class]="'bar-fill ' + row.tone" [style.width.%]="row.share"></div></div>
                <span class="num">{{ row.count }}</span>
              </div>
            }
          </div>
        </div>
        <div class="card">
          <h2>Volume by product</h2>
          <div class="bars">
            @for (row of byProduct(); track row.code) {
              <div class="bar-row">
                <span>{{ row.code }}</span>
                <div class="bar-track"><div class="bar-fill" [style.width.%]="row.share"></div></div>
                <span class="num">{{ row.count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 16px">
        <div class="toolbar" style="justify-content: space-between">
          <h2 style="margin: 0">Latest applications</h2>
          <a routerLink="/applications">View all →</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Applicant</th><th>Product</th><th class="num">Amount</th><th class="num">Score</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              @for (a of list.slice(0, 6); track a.id) {
                <tr class="clickable" (click)="open(a.id)">
                  <td>{{ a.applicantName }}</td>
                  <td>{{ a.productCode }}</td>
                  <td class="num">{{ a.amount | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
                  <td class="num">{{ a.score }}</td>
                  <td><app-status-badge [status]="a.status" /></td>
                  <td>{{ a.createdAt | date: 'MMM d, HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else {
      <div class="card empty">Loading…</div>
    }
  `,
})
export class DashboardPage {
  private readonly router = inject(Router);
  protected readonly apps = toSignal(inject(LoanApi).recent());

  protected readonly approvalRate = computed(() => {
    const list = this.apps() ?? [];
    return list.length ? (100 * list.filter((a) => a.status === 'APPROVED').length) / list.length : 0;
  });
  protected readonly avgScore = computed(() => {
    const list = this.apps() ?? [];
    return list.length ? list.reduce((s, a) => s + a.score, 0) / list.length : 0;
  });
  protected readonly approvedVolume = computed(() =>
    (this.apps() ?? []).filter((a) => a.status === 'APPROVED').reduce((s, a) => s + a.amount, 0),
  );
  protected readonly byStatus = computed(() => {
    const list = this.apps() ?? [];
    return STATUSES.map((status) => {
      const count = list.filter((a) => a.status === status).length;
      return { status, label: statusLabel(status), tone: statusTone(status), count, share: list.length ? (100 * count) / list.length : 0 };
    });
  });
  protected readonly byProduct = computed(() => {
    const list = this.apps() ?? [];
    const codes = [...new Set(list.map((a) => a.productCode))].sort();
    const max = Math.max(1, ...codes.map((c) => list.filter((a) => a.productCode === c).length));
    return codes.map((code) => {
      const count = list.filter((a) => a.productCode === code).length;
      return { code, count, share: (100 * count) / max };
    });
  });

  protected open(id: number) {
    this.router.navigate(['/applications', id]);
  }
}
