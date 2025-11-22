/**
 * Mobile Money Integration Service
 * Handles integration with mobile money providers (MTN, Airtel, etc.)
 * Note: This is a mock implementation. In production, integrate with actual provider APIs
 */

import { EncryptionService } from '@rent-to-own/encryption';

export interface MobileMoneyConfig {
  provider: 'mtn' | 'airtel' | 'africell' | 'other';
  apiKey: string;
  apiSecret: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export interface MobileMoneyPaymentRequest {
  amount: number;
  phoneNumber: string;
  provider: 'mtn' | 'airtel' | 'africell' | 'other';
  reference: string; // Payment ID or transaction reference
  description?: string;
}

export interface MobileMoneyPaymentResponse {
  success: boolean;
  transactionId?: string;
  externalTransactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  callbackUrl?: string;
}

export interface MobileMoneyCallback {
  provider: string;
  transactionId: string;
  externalTransactionId: string;
  status: 'success' | 'failed';
  amount: number;
  phoneNumber: string;
  reference: string;
  timestamp: string;
  signature?: string; // For verification
  metadata?: Record<string, any>;
}

export class MobileMoneyService {
  private config: MobileMoneyConfig;
  private encryptionService: EncryptionService;

  constructor(config: MobileMoneyConfig, encryptionService: EncryptionService) {
    this.config = config;
    this.encryptionService = encryptionService;
  }

  /**
   * Initiate a mobile money payment/debit request
   */
  async initiatePayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      // In production, this would make actual API calls to the mobile money provider
      // For now, we simulate the API call

      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(request.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Simulate API call delay
      await this.simulateApiDelay();

      // Simulate payment processing (90% success rate in sandbox, 95% in production)
      const successRate = this.config.environment === 'production' ? 0.95 : 0.90;
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        // Generate mock external transaction ID
        const externalTransactionId = `${request.provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          success: true,
          transactionId: request.reference,
          externalTransactionId,
          status: 'pending', // Most providers return pending initially
          message: 'Payment request submitted successfully',
          callbackUrl: this.config.callbackUrl,
        };
      } else {
        // Simulate common failure reasons
        const failureReasons = [
          'Insufficient funds',
          'Network error',
          'Invalid phone number',
          'Transaction timeout',
          'Account not found',
        ];
        const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

        return {
          success: false,
          status: 'failed',
          message: `Payment failed: ${reason}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Payment initiation failed',
      };
    }
  }

  /**
   * Process mobile money callback from provider
   */
  async processCallback(callback: MobileMoneyCallback): Promise<{ valid: boolean; paymentId?: string }> {
    try {
      // In production, verify the callback signature
      if (!this.verifyCallbackSignature(callback)) {
        return { valid: false };
      }

      // Extract payment ID from reference
      const paymentId = callback.reference;

      return {
        valid: true,
        paymentId,
      };
    } catch (error) {
      console.error('Error processing callback:', error);
      return { valid: false };
    }
  }

  /**
   * Verify callback signature (mock implementation)
   */
  private verifyCallbackSignature(callback: MobileMoneyCallback): boolean {
    // In production, verify the signature using provider's public key
    // For now, we assume all callbacks are valid if they have a signature
    return !!callback.signature || this.config.environment === 'sandbox';
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should start with country code or local format
    // Adjust based on your region's phone number format
    const phoneRegex = /^(\+?256|0)?[0-9]{9}$/; // Uganda format example
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  /**
   * Simulate API delay
   */
  private async simulateApiDelay(): Promise<void> {
    // Simulate network delay (500ms - 2s)
    const delay = 500 + Math.random() * 1500;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Check payment status with provider
   */
  async checkPaymentStatus(externalTransactionId: string): Promise<MobileMoneyPaymentResponse> {
    try {
      // In production, query the provider's API for payment status
      await this.simulateApiDelay();

      // Simulate status check (80% chance of completed, 20% pending)
      const isCompleted = Math.random() < 0.8;

      return {
        success: true,
        externalTransactionId,
        status: isCompleted ? 'completed' : 'pending',
        message: isCompleted ? 'Payment completed' : 'Payment pending',
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Status check failed',
      };
    }
  }
}

