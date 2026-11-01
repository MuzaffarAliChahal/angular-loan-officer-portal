import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError, DemoLoanApi } from './loan-api';

describe('DemoLoanApi', () => {
  let api: DemoLoanApi;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DemoLoanApi] });
    api = TestBed.inject(DemoLoanApi);
  });

  it('starts with sample applications, newest first', async () => {
    const list = await firstValueFrom(api.recent());
    expect(list.length).toBe(12);
    expect(new Date(list[0].createdAt) >= new Date(list[1].createdAt)).toBe(true);
  });

  it('assesses and stores a new application', async () => {
    const saved = await firstValueFrom(
      api.submit({ applicantName: '  New Person ', productCode: 'PERSONAL', monthlyIncome: 6000, monthlyDebt: 0, creditScore: 780, amount: 10000, termMonths: 24 }),
    );
    expect(saved.applicantName).toBe('New Person');
    expect(saved.status).toBe('APPROVED');
    expect((await firstValueFrom(api.get(saved.id))).id).toBe(saved.id);
  });

  it('filters by status', async () => {
    const rejected = await firstValueFrom(api.recent('REJECTED'));
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((a) => a.status === 'REJECTED')).toBe(true);
  });

  it('returns a 404 ApiError for an unknown id', async () => {
    await expect(firstValueFrom(api.get(9999))).rejects.toBeInstanceOf(ApiError);
  });
});
