/**
 * Payment Retry Service
 * Handles automated retries for failed payments with exponential backoff
 */

import { Pool } from 'pg';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface PaymentRetry {
  paymentId: string;
  attemptNumber: number;
  nextRetryAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class PaymentRetryService {
  private pool: Pool;
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 60000, // 1 minute
    maxDelayMs: 86400000, // 24 hours
    backoffMultiplier: 2,
  };

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Schedule a retry for a failed payment
   */
  async scheduleRetry(
    paymentId: string,
    currentRetryCount: number,
    config?: Partial<RetryConfig>
  ): Promise<PaymentRetry> {
    const retryConfig = { ...this.defaultConfig, ...config };
    
    if (currentRetryCount >= retryConfig.maxRetries) {
      throw new Error(`Maximum retry attempts (${retryConfig.maxRetries}) exceeded`);
    }

    // Calculate next retry time with exponential backoff
    const delayMs = Math.min(
      retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, currentRetryCount),
      retryConfig.maxDelayMs
    );
    const nextRetryAt = new Date(Date.now() + delayMs);

    // Update payment with retry information
    await this.pool.query(
      `UPDATE payments 
       SET retry_count = $1, 
           next_retry_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [currentRetryCount + 1, nextRetryAt, paymentId]
    );

    // Record retry attempt
    const retryResult = await this.pool.query(
      `INSERT INTO payment_retries (payment_id, attempt_number, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [paymentId, currentRetryCount + 1]
    );

    return {
      paymentId,
      attemptNumber: currentRetryCount + 1,
      nextRetryAt,
      status: 'pending',
    };
  }

  /**
   * Get payments that are due for retry
   */
  async getPaymentsDueForRetry(limit: number = 100): Promise<any[]> {
    const now = new Date();
    const result = await this.pool.query(
      `SELECT p.*, pp.grace_period_days
       FROM payments p
       JOIN payment_plans pp ON p.payment_plan_id = pp.id
       WHERE p.status = 'failed'
         AND p.retry_count < p.max_retries
         AND p.next_retry_at <= $1
         AND p.next_retry_at IS NOT NULL
       ORDER BY p.next_retry_at ASC
       LIMIT $2`,
      [now, limit]
    );

    return result.rows;
  }

  /**
   * Mark retry as processing
   */
  async markRetryProcessing(paymentId: string, attemptNumber: number): Promise<void> {
    await this.pool.query(
      `UPDATE payment_retries 
       SET status = 'processing', attempted_at = CURRENT_TIMESTAMP
       WHERE payment_id = $1 AND attempt_number = $2`,
      [paymentId, attemptNumber]
    );
  }

  /**
   * Mark retry as completed
   */
  async markRetryCompleted(paymentId: string, attemptNumber: number): Promise<void> {
    await this.pool.query(
      `UPDATE payment_retries 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE payment_id = $1 AND attempt_number = $2`,
      [paymentId, attemptNumber]
    );

    // Clear next_retry_at since payment succeeded
    await this.pool.query(
      `UPDATE payments SET next_retry_at = NULL WHERE id = $1`,
      [paymentId]
    );
  }

  /**
   * Mark retry as failed
   */
  async markRetryFailed(
    paymentId: string,
    attemptNumber: number,
    failureReason: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE payment_retries 
       SET status = 'failed', completed_at = CURRENT_TIMESTAMP
       WHERE payment_id = $1 AND attempt_number = $2`,
      [paymentId, attemptNumber]
    );

    // Update payment with failure reason
    await this.pool.query(
      `UPDATE payments 
       SET failure_reason = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [failureReason, paymentId]
    );
  }

  /**
   * Get retry history for a payment
   */
  async getRetryHistory(paymentId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM payment_retries 
       WHERE payment_id = $1 
       ORDER BY attempt_number ASC`,
      [paymentId]
    );

    return result.rows;
  }
}

