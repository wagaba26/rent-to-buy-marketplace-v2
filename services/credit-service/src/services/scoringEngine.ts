import {
  ApplicantData,
  CreditScoreResult,
  ScoreFactors,
  CreditTier,
  TierConfiguration,
  ScoreUpdateData,
} from '../types/scoring';

// Tier configurations mapping scores to vehicle categories and deposit requirements
export const TIER_CONFIGURATIONS: TierConfiguration[] = [
  {
    tier: 'A',
    minScore: 800,
    maxScore: 1000,
    maxVehicleValue: 50000000, // 50M UGX
    depositPercentage: 10,
    vehicleCategories: ['motorcycle', 'car', 'van', 'truck'],
  },
  {
    tier: 'B',
    minScore: 650,
    maxScore: 799,
    maxVehicleValue: 30000000, // 30M UGX
    depositPercentage: 20,
    vehicleCategories: ['motorcycle', 'car', 'van'],
  },
  {
    tier: 'C',
    minScore: 500,
    maxScore: 649,
    maxVehicleValue: 15000000, // 15M UGX
    depositPercentage: 30,
    vehicleCategories: ['motorcycle', 'car'],
  },
  {
    tier: 'D',
    minScore: 350,
    maxScore: 499,
    maxVehicleValue: 8000000, // 8M UGX
    depositPercentage: 40,
    vehicleCategories: ['motorcycle'],
  },
  {
    tier: 'E',
    minScore: 0,
    maxScore: 349,
    maxVehicleValue: 0, // Not eligible
    depositPercentage: 0,
    vehicleCategories: [],
  },
];

// Weighting rules for each data source
const WEIGHTS = {
  personalInfo: 0.15,
  mobileMoney: 0.30,
  utilityPayments: 0.20,
  saccoContributions: 0.15,
  loanPerformance: 0.20,
};

/**
 * Stateless scoring engine that calculates credit scores based on applicant data
 */
export class ScoringEngine {
  /**
   * Calculate credit score from applicant data
   */
  static calculateScore(applicantId: string, data: ApplicantData): CreditScoreResult {
    const factors = this.calculateFactors(data);
    const score = this.computeWeightedScore(factors);
    const tier = this.determineTier(score);
    const tierConfig = TIER_CONFIGURATIONS.find((t) => t.tier === tier)!;

    return {
      applicantId,
      score: Math.round(score),
      tier,
      factors,
      maximumVehicleValue: tierConfig.maxVehicleValue,
      requiredDepositPercentage: tierConfig.depositPercentage,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate individual factor scores
   */
  private static calculateFactors(data: ApplicantData): ScoreFactors {
    return {
      personalInfo: this.scorePersonalInfo(data.personalInfo),
      mobileMoney: this.scoreMobileMoney(data.mobileMoneyHistory),
      utilityPayments: this.scoreUtilityPayments(data.utilityPayments),
      saccoContributions: this.scoreSaccoContributions(data.saccoContributions),
      loanPerformance: this.scoreLoanPerformance(data.priorLoanPerformance),
    };
  }

  /**
   * Score personal information
   */
  private static scorePersonalInfo(personalInfo: ApplicantData['personalInfo']): ScoreFactors['personalInfo'] {
    let score = 0;
    const details: any = {};

    // Employment status scoring
    if (personalInfo.employmentStatus === 'employed') {
      details.employmentStatus = 100;
      score += 100;
    } else if (personalInfo.employmentStatus === 'self-employed') {
      details.employmentStatus = 70;
      score += 70;
    } else if (personalInfo.employmentStatus === 'unemployed') {
      details.employmentStatus = 30;
      score += 30;
    } else {
      details.employmentStatus = 50; // Unknown
      score += 50;
    }

    // Income stability scoring (if provided)
    if (personalInfo.monthlyIncome) {
      if (personalInfo.monthlyIncome >= 2000000) {
        details.incomeStability = 100;
        score += 100;
      } else if (personalInfo.monthlyIncome >= 1000000) {
        details.incomeStability = 80;
        score += 80;
      } else if (personalInfo.monthlyIncome >= 500000) {
        details.incomeStability = 60;
        score += 60;
      } else {
        details.incomeStability = 40;
        score += 40;
      }
    } else {
      details.incomeStability = 50; // Unknown
      score += 50;
    }

    return {
      score: Math.min(200, score), // Max 200 points
      weight: WEIGHTS.personalInfo,
      details,
    };
  }

  /**
   * Score mobile money history
   */
  private static scoreMobileMoney(
    mobileMoney?: ApplicantData['mobileMoneyHistory']
  ): ScoreFactors['mobileMoney'] {
    if (!mobileMoney) {
      return {
        score: 0,
        weight: WEIGHTS.mobileMoney,
        details: {
          volumeScore: 0,
          consistencyScore: 0,
          paymentReliability: 0,
        },
      };
    }

    let score = 0;
    const details: any = {};

    // Volume scoring (0-100 points)
    if (mobileMoney.averageMonthlyVolume >= 5000000) {
      details.volumeScore = 100;
      score += 100;
    } else if (mobileMoney.averageMonthlyVolume >= 2000000) {
      details.volumeScore = 80;
      score += 80;
    } else if (mobileMoney.averageMonthlyVolume >= 1000000) {
      details.volumeScore = 60;
      score += 60;
    } else if (mobileMoney.averageMonthlyVolume >= 500000) {
      details.volumeScore = 40;
      score += 40;
    } else {
      details.volumeScore = 20;
      score += 20;
    }

    // Consistency scoring (0-100 points)
    if (mobileMoney.consistentPaymentMonths >= 12) {
      details.consistencyScore = 100;
      score += 100;
    } else if (mobileMoney.consistentPaymentMonths >= 6) {
      details.consistencyScore = 70;
      score += 70;
    } else if (mobileMoney.consistentPaymentMonths >= 3) {
      details.consistencyScore = 50;
      score += 50;
    } else {
      details.consistencyScore = 30;
      score += 30;
    }

    // Payment reliability (0-100 points) - penalize missed payments
    const missedPaymentRate = mobileMoney.missedPayments / Math.max(1, mobileMoney.consistentPaymentMonths);
    if (missedPaymentRate === 0) {
      details.paymentReliability = 100;
      score += 100;
    } else if (missedPaymentRate <= 0.1) {
      details.paymentReliability = 80;
      score += 80;
    } else if (missedPaymentRate <= 0.2) {
      details.paymentReliability = 60;
      score += 60;
    } else if (missedPaymentRate <= 0.3) {
      details.paymentReliability = 40;
      score += 40;
    } else {
      details.paymentReliability = 20;
      score += 20;
    }

    return {
      score: Math.min(300, score), // Max 300 points
      weight: WEIGHTS.mobileMoney,
      details,
    };
  }

  /**
   * Score utility payment behavior
   */
  private static scoreUtilityPayments(
    utilityPayments?: ApplicantData['utilityPayments']
  ): ScoreFactors['utilityPayments'] {
    if (!utilityPayments) {
      return {
        score: 0,
        weight: WEIGHTS.utilityPayments,
        details: {
          onTimeRate: 0,
          consistencyScore: 0,
        },
      };
    }

    let score = 0;
    const details: any = {};

    // On-time payment rate (0-150 points)
    const onTimeRate = utilityPayments.onTimePaymentRate * 150;
    details.onTimeRate = onTimeRate;
    score += onTimeRate;

    // Consistency scoring based on months active
    if (utilityPayments.monthsActive >= 24) {
      details.consistencyScore = 50;
      score += 50;
    } else if (utilityPayments.monthsActive >= 12) {
      details.consistencyScore = 40;
      score += 40;
    } else if (utilityPayments.monthsActive >= 6) {
      details.consistencyScore = 30;
      score += 30;
    } else {
      details.consistencyScore = 20;
      score += 20;
    }

    // Penalize missed payments
    const missedPaymentRate = utilityPayments.missedPayments / Math.max(1, utilityPayments.monthsActive);
    if (missedPaymentRate > 0.3) {
      score -= 50;
    } else if (missedPaymentRate > 0.2) {
      score -= 30;
    } else if (missedPaymentRate > 0.1) {
      score -= 15;
    }

    return {
      score: Math.max(0, Math.min(200, score)), // Max 200 points
      weight: WEIGHTS.utilityPayments,
      details,
    };
  }

  /**
   * Score SACCO contributions
   */
  private static scoreSaccoContributions(
    sacco?: ApplicantData['saccoContributions']
  ): ScoreFactors['saccoContributions'] {
    if (!sacco) {
      return {
        score: 0,
        weight: WEIGHTS.saccoContributions,
        details: {
          consistencyScore: 0,
          contributionAmount: 0,
        },
      };
    }

    let score = 0;
    const details: any = {};

    // Consistency scoring
    if (sacco.consistentContributions >= 24) {
      details.consistencyScore = 100;
      score += 100;
    } else if (sacco.consistentContributions >= 12) {
      details.consistencyScore = 80;
      score += 80;
    } else if (sacco.consistentContributions >= 6) {
      details.consistencyScore = 60;
      score += 60;
    } else if (sacco.consistentContributions >= 3) {
      details.consistencyScore = 40;
      score += 40;
    } else {
      details.consistencyScore = 20;
      score += 20;
    }

    // Contribution amount scoring
    if (sacco.monthlyContribution >= 200000) {
      details.contributionAmount = 100;
      score += 100;
    } else if (sacco.monthlyContribution >= 100000) {
      details.contributionAmount = 80;
      score += 80;
    } else if (sacco.monthlyContribution >= 50000) {
      details.contributionAmount = 60;
      score += 60;
    } else {
      details.contributionAmount = 40;
      score += 40;
    }

    // Penalize missed contributions
    const missedRate = sacco.missedContributions / Math.max(1, sacco.monthsActive);
    if (missedRate > 0.2) {
      score -= 50;
    } else if (missedRate > 0.1) {
      score -= 30;
    }

    return {
      score: Math.max(0, Math.min(200, score)), // Max 200 points
      weight: WEIGHTS.saccoContributions,
      details,
    };
  }

  /**
   * Score prior loan performance
   */
  private static scoreLoanPerformance(
    loans?: ApplicantData['priorLoanPerformance']
  ): ScoreFactors['loanPerformance'] {
    if (!loans || loans.length === 0) {
      return {
        score: 100, // Neutral score for no loan history
        weight: WEIGHTS.loanPerformance,
        details: {
          repaymentRate: 0,
          defaultHistory: 0,
          currentStatus: 0,
        },
      };
    }

    let score = 0;
    const details: any = {};

    // Calculate average repayment rate
    const avgRepaymentRate =
      loans.reduce((sum, loan) => sum + loan.onTimeRepaymentRate, 0) / loans.length;
    details.repaymentRate = avgRepaymentRate * 100;
    score += avgRepaymentRate * 100;

    // Default history scoring (penalize defaults)
    const totalDefaults = loans.reduce((sum, loan) => sum + (loan.defaultedLoans || 0), 0);
    if (totalDefaults === 0) {
      details.defaultHistory = 100;
      score += 100;
    } else if (totalDefaults === 1) {
      details.defaultHistory = 50;
      score += 50;
    } else {
      details.defaultHistory = 0;
      score += 0;
    }

    // Current status scoring
    const currentLoans = loans.filter((loan) => loan.repaymentStatus === 'current');
    const completedLoans = loans.filter((loan) => loan.repaymentStatus === 'completed');
    const defaultedLoans = loans.filter((loan) => loan.repaymentStatus === 'defaulted');

    if (currentLoans.length > 0 && defaultedLoans.length === 0) {
      details.currentStatus = 100;
      score += 100;
    } else if (completedLoans.length > 0 && defaultedLoans.length === 0) {
      details.currentStatus = 80;
      score += 80;
    } else if (defaultedLoans.length > 0) {
      details.currentStatus = 0;
      score += 0;
    } else {
      details.currentStatus = 50;
      score += 50;
    }

    return {
      score: Math.max(0, Math.min(300, score)), // Max 300 points
      weight: WEIGHTS.loanPerformance,
      details,
    };
  }

  /**
   * Compute weighted score from factors
   */
  private static computeWeightedScore(factors: ScoreFactors): number {
    const weightedScore =
      factors.personalInfo.score * factors.personalInfo.weight +
      factors.mobileMoney.score * factors.mobileMoney.weight +
      factors.utilityPayments.score * factors.utilityPayments.weight +
      factors.saccoContributions.score * factors.saccoContributions.weight +
      factors.loanPerformance.score * factors.loanPerformance.weight;

    // Normalize to 0-1000 scale
    // Max possible: (200*0.15 + 300*0.30 + 200*0.20 + 200*0.15 + 300*0.20) = 30 + 90 + 40 + 30 + 60 = 250
    // We scale this to 1000
    return Math.max(0, Math.min(1000, (weightedScore / 250) * 1000));
  }

  /**
   * Determine credit tier from score
   */
  private static determineTier(score: number): CreditTier {
    for (const config of TIER_CONFIGURATIONS) {
      if (score >= config.minScore && score <= config.maxScore) {
        return config.tier;
      }
    }
    return 'E'; // Default to lowest tier
  }

  /**
   * Update score based on new data (repayment, telematics, etc.)
   */
  static updateScore(
    currentScore: number,
    currentTier: CreditTier,
    updateData: ScoreUpdateData
  ): { newScore: number; newTier: CreditTier; adjustment: number } {
    let adjustment = 0;

    if (updateData.updateType === 'repayment') {
      if (updateData.data.repaymentSuccess) {
        // Reward successful repayment
        adjustment = 15;
      } else {
        // Penalize failed repayment
        adjustment = -25;
      }
    } else if (updateData.updateType === 'telematics') {
      if (updateData.data.telematicsScore !== undefined) {
        // Reward safe driving (0-1 scale, 1 = perfect)
        const telematicsAdjustment = (updateData.data.telematicsScore - 0.5) * 30; // -15 to +15
        adjustment = Math.round(telematicsAdjustment);

        // Additional penalties for violations
        if (updateData.data.telematicsEvents) {
          const { speedingViolations, harshBraking } = updateData.data.telematicsEvents;
          adjustment -= speedingViolations * 5;
          adjustment -= harshBraking * 3;
        }

        // Reward safe driving days
        if (updateData.data.telematicsEvents?.safeDrivingDays) {
          adjustment += Math.min(10, updateData.data.telematicsEvents.safeDrivingDays * 0.5);
        }
      }
    } else if (updateData.updateType === 'payment') {
      if (updateData.data.paymentSuccess) {
        adjustment = 10;
      } else {
        adjustment = -20;
      }
    }

    const newScore = Math.max(0, Math.min(1000, currentScore + adjustment));
    const newTier = this.determineTier(newScore);

    return {
      newScore: Math.round(newScore),
      newTier,
      adjustment,
    };
  }

  /**
   * Get tier configuration
   */
  static getTierConfig(tier: CreditTier): TierConfiguration | undefined {
    return TIER_CONFIGURATIONS.find((t) => t.tier === tier);
  }
}

