export type CountryCode = 'United States' | 'United Kingdom' | 'Canada' | 'Australia';
export type CurrencyCode = 'USD' | 'GBP' | 'CAD' | 'AUD';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Verdict = 'PASS' | 'POTENTIAL_FAILURE' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StoreProfile {
  id: string;
  name: string;
  url: string;
  country: CountryCode;
  currency: CurrencyCode;
  shippingPolicy: string;
  returnPolicy: string;
  productFacts: string;
  discountRules: string;
  warrantyInfo: string;
  escalationRules: string;
  additionalPolicies?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string; // e.g. "TC-001"
  storeId: string;
  category: string;
  question: string;
  expectedCriteria: string;
  sourcePolicy: string;
  sourceExcerpt?: string;
  riskLevel: RiskLevel;
  whyItMatters: string;
  isEdgeCase?: boolean;
  requiresEscalation?: boolean;
  createdAt: string;
}

export interface EvaluationResult {
  verdict: Verdict;
  severity: Severity;
  confidence: number; // 0-100
  shortExplanation: string;
  unsupportedClaims: string[];
  relevantSourcePolicy: string;
  supportingQuotation: string;
  expectedAnswerCriteria: string;
  suggestedCorrection: string;
  recommendedNextAction: string;
  disclaimer: string;
  evaluatedAt: string;
}

export interface HumanReview {
  status: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN';
  verdictOverride?: Verdict;
  reviewerNotes: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface TestExecution {
  testCaseId: string;
  testCase: TestCase;
  chatbotAnswer: string;
  evaluation?: EvaluationResult;
  humanReview?: HumanReview;
  status: 'UNTESTED' | 'EVALUATING' | 'EVALUATED' | 'ERROR';
  errorMessage?: string;
}

export interface TestRun {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  createdAt: string;
  completedAt?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  executions: TestExecution[];
  summary?: {
    total: number;
    pass: number;
    potentialFailure: number;
    needsReview: number;
    insufficientEvidence: number;
    criticalCount: number;
    highCount: number;
  };
  notes?: string;
}

export interface UserWorkspace {
  id: string;
  name: string;
  email: string;
  role: string;
}
