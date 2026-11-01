import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, LoanApi } from '../core/loan-api';
import { Assessment, LoanApplicationRequest } from '../core/models';
import { monthlyPayment, parseReason } from '../core/scoring';
import { StatusBadge } from '../shared/status-badge';

@Component({
  selector: 'app-apply',
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink, StatusBadge],
  template: `
    <h1>New application</h1>
    <p class="subtitle">Enter the applicant's details. The API returns an instant decision with the reason for every rule.</p>

    <div class="grid two-col" style="align-items: start">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid">
          <div class="field" style="grid-column: 1 / -1">
            <label for="applicantName">Applicant name</label>
            <input id="applicantName" formControlName="applicantName" [class.invalid]="showError('applicantName')" />
            @if (showError('applicantName')) { <span class="error">{{ fieldError('applicantName') }}</span> }
          </div>
          <div class="field">
            <label for="productCode">Product</label>
            <select id="productCode" formControlName="productCode">
              @for (p of products() ?? []; track p.code) { <option [value]="p.code">{{ p.name }} ({{ p.annualRate }}%)</option> }
            </select>
          </div>
          <div class="field">
            <label for="creditScore">Credit score</label>
            <input id="creditScore" type="number" formControlName="creditScore" [class.invalid]="showError('creditScore')" />
            @if (showError('creditScore')) { <span class="error">{{ fieldError('creditScore') }}</span> }
          </div>
          <div class="field">
            <label for="amount">Loan amount</label>
            <input id="amount" type="number" formControlName="amount" [class.invalid]="showError('amount')" />
            @if (product(); as p) { <span class="hint">{{ p.minAmount | currency: 'USD' : 'symbol' : '1.0-0' }} – {{ p.maxAmount | currency: 'USD' : 'symbol' : '1.0-0' }}</span> }
            @if (showError('amount')) { <span class="error">{{ fieldError('amount') }}</span> }
          </div>
          <div class="field">
            <label for="termMonths">Term (months)</label>
            <input id="termMonths" type="number" formControlName="termMonths" [class.invalid]="showError('termMonths')" />
            @if (product(); as p) { <span class="hint">up to {{ p.maxTermMonths }} months</span> }
            @if (showError('termMonths')) { <span class="error">{{ fieldError('termMonths') }}</span> }
          </div>
          <div class="field">
            <label for="monthlyIncome">Monthly income</label>
            <input id="monthlyIncome" type="number" formControlName="monthlyIncome" [class.invalid]="showError('monthlyIncome')" />
            @if (showError('monthlyIncome')) { <span class="error">{{ fieldError('monthlyIncome') }}</span> }
          </div>
          <div class="field">
            <label for="monthlyDebt">Existing monthly debt</label>
            <input id="monthlyDebt" type="number" formControlName="monthlyDebt" [class.invalid]="showError('monthlyDebt')" />
            @if (showError('monthlyDebt')) { <span class="error">{{ fieldError('monthlyDebt') }}</span> }
          </div>
          @if (product()?.maxLtv != null) {
            <div class="field" style="grid-column: 1 / -1">
              <label for="propertyValue">Collateral value</label>
              <input id="propertyValue" type="number" formControlName="propertyValue" />
              <span class="hint">Required for secured products. Max loan-to-value {{ (product()?.maxLtv ?? 0) * 100 }}%.</span>
            </div>
          }
        </div>

        @if (payment() != null) {
          <p class="hint" style="margin-top: 14px">Estimated monthly payment: <strong>{{ payment() | currency: 'USD' }}</strong></p>
        }
        @if (error()) { <p class="error">{{ error() }}</p> }

        <div class="actions">
          <button class="primary" type="submit" [disabled]="submitting()">{{ submitting() ? 'Assessing…' : 'Submit for decision' }}</button>
          <button class="ghost" type="button" (click)="reset()">Reset</button>
        </div>
      </form>

      <div class="card">
        @if (result(); as r) {
          <div class="toolbar" style="justify-content: space-between">
            <h2 style="margin: 0">Decision for {{ r.applicantName }}</h2>
            <app-status-badge [status]="r.status" />
          </div>
          <p>Score <strong>{{ r.score }}</strong> / 100 · Monthly payment <strong>{{ r.monthlyPayment | currency: 'USD' }}</strong></p>
          <table>
            <thead><tr><th>Rule</th><th>Result</th><th>Reason</th></tr></thead>
            <tbody>
              @for (reason of reasons(); track $index) {
                <tr>
                  <td>{{ reason.rule }}</td>
                  <td><span class="badge" [class.ok]="reason.outcome === 'PASS'" [class.warn]="reason.outcome === 'REVIEW'" [class.bad]="reason.outcome === 'FAIL'">{{ reason.outcome }}</span></td>
                  <td>{{ reason.message }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p style="margin-top: 14px"><a [routerLink]="['/applications', r.id]">Open application #{{ r.id }} →</a></p>
        } @else {
          <h2>Decision</h2>
          <p class="hint">Submit the form to see the decision. Try a credit score below 620, or a collateral value close to the loan amount, to see rejections and manual reviews.</p>
        }
      </div>
    </div>
  `,
})
export class ApplyPage {
  private readonly api = inject(LoanApi);
  private readonly fb = inject(FormBuilder);

  protected readonly products = toSignal(this.api.products());
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<Assessment | null>(null);
  private readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    applicantName: ['', [Validators.required, Validators.maxLength(120)]],
    productCode: ['PERSONAL', Validators.required],
    creditScore: [720, [Validators.required, Validators.min(300), Validators.max(850)]],
    amount: [15000, [Validators.required, Validators.min(1)]],
    termMonths: [36, [Validators.required, Validators.min(1), Validators.max(480)]],
    monthlyIncome: [6000, [Validators.required, Validators.min(1)]],
    monthlyDebt: [500, [Validators.required, Validators.min(0)]],
    propertyValue: [null as number | null],
  });

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly product = computed(() => (this.products() ?? []).find((p) => p.code === this.values().productCode));
  protected readonly payment = computed(() => {
    const p = this.product();
    const v = this.values();
    if (!p || !v.amount || !v.termMonths || v.amount <= 0 || v.termMonths <= 0) return null;
    return monthlyPayment(v.amount, p.annualRate, v.termMonths);
  });
  protected readonly reasons = computed(() => (this.result()?.reasons ?? []).map(parseReason));

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return (c.invalid && (c.touched || c.dirty)) || !!this.serverErrors()[name];
  }

  protected fieldError(name: keyof typeof this.form.controls): string {
    const server = this.serverErrors()[name];
    if (server) return server;
    const e = this.form.controls[name].errors ?? {};
    if (e['required']) return 'Required';
    if (e['min']) return `Must be at least ${e['min'].min}`;
    if (e['max']) return `Must be at most ${e['max'].max}`;
    if (e['maxlength']) return `At most ${e['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  submit() {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const request: LoanApplicationRequest = { ...v, applicantName: v.applicantName.trim(), propertyValue: v.propertyValue || null };
    this.submitting.set(true);
    this.error.set(null);
    this.api.submit(request).subscribe({
      next: (r) => {
        this.result.set(r);
        this.submitting.set(false);
      },
      error: (e: unknown) => {
        this.submitting.set(false);
        if (e instanceof ApiError) {
          this.serverErrors.set(e.fieldErrors);
          this.error.set(e.message);
        } else {
          this.error.set('Something went wrong. Please try again.');
        }
      },
    });
  }

  reset() {
    this.form.reset();
    this.result.set(null);
    this.error.set(null);
    this.serverErrors.set({});
  }
}
