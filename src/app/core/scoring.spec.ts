import { DEMO_PRODUCTS } from './loan-api';
import { LoanApplicationRequest } from './models';
import { assess, monthlyPayment, parseReason } from './scoring';

const personal = DEMO_PRODUCTS.find((p) => p.code === 'PERSONAL')!;
const home = DEMO_PRODUCTS.find((p) => p.code === 'HOME')!;

const base: LoanApplicationRequest = {
  applicantName: 'Test', productCode: 'PERSONAL', monthlyIncome: 6000, monthlyDebt: 500,
  creditScore: 760, amount: 15000, termMonths: 36,
};

describe('monthlyPayment', () => {
  it('matches the standard amortisation formula', () => {
    expect(monthlyPayment(15000, 14.5, 36)).toBe(516.31);
    expect(monthlyPayment(180000, 8.75, 240)).toBe(1590.68);
  });

  it('divides evenly at a zero rate', () => {
    expect(monthlyPayment(1200, 0, 12)).toBe(100);
  });

  it('rejects a non-positive term', () => {
    expect(() => monthlyPayment(1000, 10, 0)).toThrow();
  });
});

describe('assess', () => {
  it('approves a strong applicant with score 100', () => {
    const d = assess(base, personal);
    expect(d.status).toBe('APPROVED');
    expect(d.score).toBe(100);
    expect(d.reasons).toHaveLength(4);
  });

  it('sends a fair credit score to manual review', () => {
    const d = assess({ ...base, creditScore: 650 }, personal);
    expect(d.status).toBe('MANUAL_REVIEW');
    expect(d.score).toBe(85);
  });

  it('rejects a poor credit score', () => {
    expect(assess({ ...base, creditScore: 590 }, personal).status).toBe('REJECTED');
  });

  it('rejects when debt-to-income is above 43%', () => {
    const d = assess({ ...base, monthlyIncome: 2000, monthlyDebt: 600 }, personal);
    expect(d.status).toBe('REJECTED');
    expect(d.reasons.some((r) => r.startsWith('[FAIL] DTI'))).toBe(true);
  });

  it('rejects amounts outside product limits', () => {
    expect(assess({ ...base, amount: 60000 }, personal).status).toBe('REJECTED');
  });

  it('requires collateral for secured products', () => {
    const d = assess({ ...base, productCode: 'HOME', amount: 100000, termMonths: 240, monthlyIncome: 12000 }, home);
    expect(d.status).toBe('REJECTED');
    expect(d.reasons.some((r) => r.includes('collateral value is required'))).toBe(true);
  });

  it('reviews a loan-to-value just above the product maximum', () => {
    const d = assess(
      { ...base, productCode: 'HOME', amount: 210000, termMonths: 300, monthlyIncome: 15000, propertyValue: 250000 },
      home,
    );
    expect(d.status).toBe('MANUAL_REVIEW');
    expect(d.reasons.some((r) => r.startsWith('[REVIEW] LTV'))).toBe(true);
  });
});

describe('parseReason', () => {
  it('splits outcome, rule and message', () => {
    expect(parseReason('[REVIEW] CREDIT: credit score 650 is between 620 and 699')).toEqual({
      outcome: 'REVIEW', rule: 'CREDIT', message: 'credit score 650 is between 620 and 699',
    });
  });
});
