import axios, { AxiosInstance } from 'axios';

export interface CreditScoreResult {
  applicantId: string;
  score: number;
  tier: number;
  factors: any;
  maximumVehicleValue: number;
  requiredDepositPercentage: number;
  lastUpdated: string;
}

export interface EligibilityTier {
  applicantId: string;
  tier: number;
  score: number;
  tierConfiguration: {
    tier: number;
    minScore: number;
    maxScore: number;
    maxVehicleValue: number;
    depositPercentage: number;
    vehicleCategories: string[];
  };
  maximumVehicleValue: number;
  requiredDepositPercentage: number;
  lastUpdated: string;
}

export class CreditServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = process.env.CREDIT_SERVICE_URL || 'http://localhost:3004') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Score an applicant during onboarding
   */
  async scoreApplicant(applicantId: string, applicantData: any): Promise<CreditScoreResult> {
    try {
      const response = await this.client.post('/scoreApplicant', {
        applicantId,
        applicantData,
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Invalid response from credit service');
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Credit service error: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Failed to connect to credit service: ${error.message}`);
    }
  }

  /**
   * Get eligibility tier for an applicant
   */
  async getEligibilityTier(applicantId: string): Promise<EligibilityTier | null> {
    try {
      const response = await this.client.get(`/getTier/${applicantId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Applicant not scored yet
      }
      console.error('Error fetching eligibility tier:', error.message);
      return null; // Return null on error to prevent blocking onboarding
    }
  }

  /**
   * Get current credit score for an applicant
   */
  async getCreditScore(applicantId: string): Promise<CreditScoreResult | null> {
    try {
      const response = await this.client.get(`/score/${applicantId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching credit score:', error.message);
      return null;
    }
  }

  /**
   * Update credit score (called when KYC is approved or other events occur)
   */
  async updateScore(
    applicantId: string,
    updateType: 'repayment' | 'telematics' | 'payment' | 'manual',
    data: any
  ): Promise<any> {
    try {
      const response = await this.client.post('/updateScore', {
        applicantId,
        updateType,
        data,
      });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Invalid response from credit service');
    } catch (error: any) {
      if (error.response) {
        console.error('Credit service update error:', error.response.data);
        throw new Error(
          `Credit service error: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Failed to connect to credit service: ${error.message}`);
    }
  }
}

