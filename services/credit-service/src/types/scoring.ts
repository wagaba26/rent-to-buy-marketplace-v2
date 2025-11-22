// Types for the independent credit-scoring service

export interface ApplicantData {
  personalInfo: {
    firstName: string;
    lastName: string;
    nationalId: string;
    phoneNumber: string;
    email?: string;
    dateOfBirth?: string;
    employmentStatus?: 'employed' | 'self-employed' | 'unemployed';
    monthlyIncome?: number;
  };
  mobileMoneyHistory?: {
    provider: 'MTN' | 'Airtel' | 'Equity' | 'M-Pesa';
    accountNumber: string;
    averageMonthlyVolume: number;
    averageMonthlyTransactions: number;
    consistentPaymentMonths: number; // Number of months with consistent activity
    missedPayments: number; // Number of missed or failed payments
    lastActivityDate: string;
  };
  utilityPayments?: {
    provider: string; // Electricity, water, etc.
    accountNumber: string;
    averageMonthlyAmount: number;
    onTimePaymentRate: number; // 0-1, percentage of on-time payments
    monthsActive: number;
    lastPaymentDate: string;
    missedPayments: number;
  };
  saccoContributions?: {
    saccoName: string;
    memberNumber: string;
    monthlyContribution: number;
    monthsActive: number;
    consistentContributions: number; // Number of consistent months
    missedContributions: number;
    lastContributionDate: string;
  };
  priorLoanPerformance?: {
    lenderName: string;
    loanAmount: number;
    loanType: string;
    repaymentStatus: 'current' | 'completed' | 'defaulted' | 'delinquent';
    onTimeRepaymentRate: number; // 0-1
    monthsRepaid: number;
    totalMonths: number;
    defaultedLoans: number;
    lastRepaymentDate?: string;
  }[];
}

export interface CreditScoreResult {
  applicantId: string;
  score: number; // 0-1000
  tier: CreditTier;
  factors: ScoreFactors;
  maximumVehicleValue: number;
  requiredDepositPercentage: number;
  calculatedAt: Date;
}

export interface ScoreFactors {
  personalInfo: {
    score: number;
    weight: number;
    details: {
      employmentStatus: number;
      incomeStability: number;
    };
  };
  mobileMoney: {
    score: number;
    weight: number;
    details: {
      volumeScore: number;
      consistencyScore: number;
      paymentReliability: number;
    };
  };
  utilityPayments: {
    score: number;
    weight: number;
    details: {
      onTimeRate: number;
      consistencyScore: number;
    };
  };
  saccoContributions: {
    score: number;
    weight: number;
    details: {
      consistencyScore: number;
      contributionAmount: number;
    };
  };
  loanPerformance: {
    score: number;
    weight: number;
    details: {
      repaymentRate: number;
      defaultHistory: number;
      currentStatus: number;
    };
  };
}

export type CreditTier = 'A' | 'B' | 'C' | 'D' | 'E';

export interface TierConfiguration {
  tier: CreditTier;
  minScore: number;
  maxScore: number;
  maxVehicleValue: number;
  depositPercentage: number;
  vehicleCategories: string[]; // e.g., ['motorcycle', 'car']
}

export interface ScoreUpdateData {
  applicantId: string;
  updateType: 'repayment' | 'telematics' | 'payment' | 'manual';
  data: {
    repaymentSuccess?: boolean;
    repaymentAmount?: number;
    telematicsScore?: number; // 0-1, based on safe driving
    telematicsEvents?: {
      speedingViolations: number;
      harshBraking: number;
      safeDrivingDays: number;
    };
    paymentSuccess?: boolean;
    paymentAmount?: number;
  };
}

export interface AuditLog {
  id: string;
  applicantId: string;
  action: 'score_calculated' | 'score_updated' | 'tier_assigned';
  scoreBefore?: number;
  scoreAfter?: number;
  tierBefore?: CreditTier;
  tierAfter?: CreditTier;
  inputs: any;
  decision: string;
  timestamp: Date;
}

