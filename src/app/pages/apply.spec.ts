import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DemoLoanApi, LoanApi } from '../core/loan-api';
import { ApplyPage } from './apply';

describe('ApplyPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApplyPage],
      providers: [provideRouter([]), { provide: LoanApi, useClass: DemoLoanApi }],
    });
  });

  it('does not submit an invalid form and shows field errors', async () => {
    const fixture = TestBed.createComponent(ApplyPage);
    const page = fixture.componentInstance;
    page.form.controls.creditScore.setValue(200);
    page.submit();
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Required');
    expect(text).toContain('Must be at least 300');
    expect(text).not.toContain('Decision for');
  });

  it('shows the decision returned by the API', async () => {
    const fixture = TestBed.createComponent(ApplyPage);
    const page = fixture.componentInstance;
    page.form.patchValue({ applicantName: 'Ayesha Khan', creditScore: 760 });
    page.submit();
    await new Promise((r) => setTimeout(r, 400));
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Decision for Ayesha Khan');
    expect(text).toContain('Approved');
  });
});
