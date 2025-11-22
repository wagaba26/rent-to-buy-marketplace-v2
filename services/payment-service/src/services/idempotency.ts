/**
 * Idempotency Service
 * Ensures that payment transactions are idempotent to prevent double-charges
 */

import { Pool } from 'pg';

export class IdempotencyService {
  private pool: Pool;
  private keyExpiryHours: number = 24;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Check if an idempotency key exists and return cached response if found
   */
  async checkIdempotencyKey(key: string): Promise<{ exists: boolean; paymentId?: string; responseData?: any }> {
    const result = await this.pool.query(
      `SELECT payment_id, response_data, expires_at 
       FROM idempotency_keys 
       WHERE key = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [key]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        exists: true,
        paymentId: row.payment_id,
        responseData: row.response_data,
      };
    }

    return { exists: false };
  }

  /**
   * Store idempotency key with payment ID and response
   */
  async storeIdempotencyKey(
    key: string,
    paymentId: string,
    responseData: any
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.keyExpiryHours);

    await this.pool.query(
      `INSERT INTO idempotency_keys (key, payment_id, response_data, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE 
       SET payment_id = EXCLUDED.payment_id,
           response_data = EXCLUDED.response_data,
           expires_at = EXCLUDED.expires_at`,
      [key, paymentId, JSON.stringify(responseData), expiresAt]
    );
  }

  /**
   * Generate a unique idempotency key
   */
  static generateIdempotencyKey(prefix: string = 'payment'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM idempotency_keys WHERE expires_at <= CURRENT_TIMESTAMP`
    );
    return result.rowCount || 0;
  }

  /**
   * Validate idempotency key format
   */
  static isValidKey(key: string): boolean {
    // Key should be non-empty and reasonable length
    return key && key.length > 0 && key.length <= 255;
  }
}

