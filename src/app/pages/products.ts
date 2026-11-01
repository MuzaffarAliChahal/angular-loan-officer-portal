import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoanApi } from '../core/loan-api';
import { monthlyPayment } from '../core/scoring';

@Component({
  selector: 'app-products',
  imports: [CurrencyPipe, PercentPipe],
  template: `
    <h1>Loan products</h1>
    <p class="subtitle">Served by <code>GET /api/v1/products</code> (cached in the API with Spring Cache).</p>
    <div class="grid kpis">
      @for (p of products() ?? []; track p.code) {
        <div class="card">
          <div class="kpi-label">{{ p.code }}</div>
          <div class="kpi-value" style="font-size: 20px">{{ p.name }}</div>
          <table style="margin-top: 12px">
            <tbody>
              <tr><td>Rate</td><td class="num">{{ p.annualRate }}% APR</td></tr>
              <tr><td>Amount</td><td class="num">{{ p.minAmount | currency: 'USD' : 'symbol' : '1.0-0' }} – {{ p.maxAmount | currency: 'USD' : 'symbol' : '1.0-0' }}</td></tr>
              <tr><td>Max term</td><td class="num">{{ p.maxTermMonths }} months</td></tr>
              <tr><td>Collateral</td><td class="num">{{ p.maxLtv != null ? 'max LTV ' + (p.maxLtv | percent) : 'not required' }}</td></tr>
              <tr><td>Payment on min. amount, max term</td><td class="num">{{ example(p.minAmount, p.annualRate, p.maxTermMonths) | currency: 'USD' }}</td></tr>
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ProductsPage {
  protected readonly products = toSignal(inject(LoanApi).products());
  protected readonly example = monthlyPayment;
}
