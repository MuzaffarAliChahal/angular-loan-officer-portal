export type ApplicationStatus = 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED';

export const STATUSES: ApplicationStatus[] = ['APPROVED', 'MANUAL_REVIEW', 'REJECTED'];

/** Mirrors ProductSnapshot from the Spring Boot loan-assessment-api. */
export interface LoanProduct {
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  annualRate: number;
  maxTermMonths: number;
  /** Maximum loan-to-value for secured products; null for unsecured. */
  maxLtv: number | null;
}

/** Mirrors LoanApplicationRequest (POST /api/v1/applications). */
export interface LoanApplicationRequest {
  applicantName: string;
  productCode: string;
  monthlyIncome: number;
  monthlyDebt: number;
  creditScore: number;
  amount: number;
  termMonths: number;
  propertyValue?: number | null;
}

/** Mirrors AssessmentResponse. */
export interface Assessment {
  id: number;
  applicantName: string;
  productCode: string;
  amount: number;
  termMonths: number;
  monthlyPayment: number;
  status: ApplicationStatus;
  score: number;
  reasons: string[];
  createdAt: string;
}

/** RFC 7807 problem response returned by the API on errors. */
export interface ProblemDetail {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string>;
}
