import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApplicationStatus, Assessment, LoanApplicationRequest, LoanProduct, ProblemDetail } from './models';
import { assess } from './scoring';

/** Error with the field messages from the API's ProblemDetail, so forms can show them per field. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly fieldErrors: Record<string, string> = {}) {
    super(message);
  }
}

/** The contract the pages depend on. Two implementations: live HTTP and in-browser demo. */
export abstract class LoanApi {
  abstract readonly mode: 'live' | 'demo';
  abstract products(): Observable<LoanProduct[]>;
  abstract submit(request: LoanApplicationRequest): Observable<Assessment>;
  abstract recent(status?: ApplicationStatus): Observable<Assessment[]>;
  abstract get(id: number): Observable<Assessment>;
}

/** Talks to the Spring Boot loan-assessment-api (/api/v1/...). */
@Injectable()
export class HttpLoanApi extends LoanApi {
  readonly mode = 'live' as const;
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1`;

  products() {
    return this.http.get<LoanProduct[]>(`${this.base}/products`).pipe(catchError(toApiError));
  }
  submit(request: LoanApplicationRequest) {
    return this.http.post<Assessment>(`${this.base}/applications`, request).pipe(catchError(toApiError));
  }
  recent(status?: ApplicationStatus) {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Assessment[]>(`${this.base}/applications`, { params }).pipe(catchError(toApiError));
  }
  get(id: number) {
    return this.http.get<Assessment>(`${this.base}/applications/${id}`).pipe(catchError(toApiError));
  }
}

function toApiError(err: HttpErrorResponse): Observable<never> {
  const problem = (err.error ?? {}) as ProblemDetail;
  const message = problem.detail ?? problem.title ?? (err.status === 0 ? 'Cannot reach the API' : `Request failed (${err.status})`);
  return throwError(() => new ApiError(message, err.status, problem.errors ?? {}));
}

export const DEMO_PRODUCTS: LoanProduct[] = [
  { code: 'PERSONAL', name: 'Personal Loan', minAmount: 1000, maxAmount: 50000, annualRate: 14.5, maxTermMonths: 60, maxLtv: null },
  { code: 'AUTO', name: 'Auto Loan', minAmount: 5000, maxAmount: 100000, annualRate: 10, maxTermMonths: 84, maxLtv: 0.9 },
  { code: 'HOME', name: 'Home Loan', minAmount: 20000, maxAmount: 1000000, annualRate: 8.75, maxTermMonths: 360, maxLtv: 0.8 },
];

const SEED: LoanApplicationRequest[] = [
  { applicantName: 'Ayesha Khan', productCode: 'PERSONAL', monthlyIncome: 6000, monthlyDebt: 500, creditScore: 760, amount: 15000, termMonths: 36 },
  { applicantName: 'Usman Tariq', productCode: 'HOME', monthlyIncome: 12000, monthlyDebt: 800, creditScore: 745, amount: 180000, termMonths: 240, propertyValue: 260000 },
  { applicantName: 'Sara Malik', productCode: 'AUTO', monthlyIncome: 9000, monthlyDebt: 0, creditScore: 720, amount: 23000, termMonths: 60, propertyValue: 25000 },
  { applicantName: 'Bilal Ahmed', productCode: 'PERSONAL', monthlyIncome: 4000, monthlyDebt: 900, creditScore: 590, amount: 20000, termMonths: 48 },
  { applicantName: 'Hina Shah', productCode: 'PERSONAL', monthlyIncome: 5200, monthlyDebt: 1100, creditScore: 680, amount: 12000, termMonths: 36 },
  { applicantName: 'Omar Farooq', productCode: 'HOME', monthlyIncome: 15000, monthlyDebt: 1500, creditScore: 790, amount: 300000, termMonths: 300, propertyValue: 420000 },
  { applicantName: 'Zara Iqbal', productCode: 'AUTO', monthlyIncome: 7000, monthlyDebt: 400, creditScore: 705, amount: 30000, termMonths: 72, propertyValue: 31500 },
  { applicantName: 'Daniyal Raza', productCode: 'HOME', monthlyIncome: 8000, monthlyDebt: 600, creditScore: 650, amount: 210000, termMonths: 300, propertyValue: 250000 },
  { applicantName: 'Mariam Aslam', productCode: 'PERSONAL', monthlyIncome: 9500, monthlyDebt: 300, creditScore: 810, amount: 25000, termMonths: 48 },
  { applicantName: 'Fahad Javed', productCode: 'AUTO', monthlyIncome: 3500, monthlyDebt: 700, creditScore: 640, amount: 40000, termMonths: 84, propertyValue: 42000 },
  { applicantName: 'Nida Hussain', productCode: 'PERSONAL', monthlyIncome: 7500, monthlyDebt: 200, creditScore: 735, amount: 8000, termMonths: 24 },
  { applicantName: 'Kamran Ali', productCode: 'HOME', monthlyIncome: 20000, monthlyDebt: 2500, creditScore: 765, amount: 450000, termMonths: 360, propertyValue: 600000 },
];

/**
 * In-browser fake of the API, so the portal runs on GitHub Pages without a backend.
 * Uses the same rules as the Java service and starts with sample applications.
 */
@Injectable()
export class DemoLoanApi extends LoanApi {
  readonly mode = 'demo' as const;
  private readonly store: Assessment[] = [];
  private nextId = 1;
  private readonly latency = environment.demoLatencyMs;

  constructor() {
    super();
    const now = Date.now();
    SEED.forEach((req, i) => this.save(req, new Date(now - (SEED.length - i) * 3.7 * 3600_000)));
  }

  products() {
    return of(DEMO_PRODUCTS).pipe(delay(this.latency));
  }

  submit(request: LoanApplicationRequest) {
    const product = DEMO_PRODUCTS.find((p) => p.code === request.productCode);
    if (!product) return throwError(() => new ApiError(`Product ${request.productCode} not found`, 404));
    return of(this.save(request, new Date())).pipe(delay(this.latency));
  }

  recent(status?: ApplicationStatus) {
    return of(this.store.filter((a) => !status || a.status === status).slice(0, 50)).pipe(delay(this.latency));
  }

  get(id: number) {
    const found = this.store.find((a) => a.id === id);
    return found ? of(found).pipe(delay(this.latency)) : throwError(() => new ApiError(`Application ${id} not found`, 404));
  }

  private save(request: LoanApplicationRequest, createdAt: Date): Assessment {
    const product = DEMO_PRODUCTS.find((p) => p.code === request.productCode)!;
    const saved: Assessment = {
      id: this.nextId++,
      applicantName: request.applicantName.trim(),
      productCode: product.code,
      amount: request.amount,
      termMonths: request.termMonths,
      createdAt: createdAt.toISOString(),
      ...assess(request, product),
    };
    this.store.unshift(saved);
    return saved;
  }
}
