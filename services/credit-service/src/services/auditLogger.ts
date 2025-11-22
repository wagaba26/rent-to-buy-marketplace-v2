import { Pool } from 'pg';
import { CreditTier, AuditLog } from '../types/scoring';

/**
 * Service for logging all scoring decisions for auditability
 */
export class AuditLogger {
  constructor(private pool: Pool) {}

  /**
   * Log a scoring action
   */
  async logAction(
    applicantId: string,
    action: AuditLog['action'],
    inputs: any,
    decision: string,
    metadata?: {
      scoreBefore?: number;
      scoreAfter?: number;
      tierBefore?: CreditTier;
      tierAfter?: CreditTier;
    }
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO scoring_audit_logs 
         (applicant_id, action, score_before, score_after, tier_before, tier_after, inputs, decision, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          applicantId,
          action,
          metadata?.scoreBefore || null,
          metadata?.scoreAfter || null,
          metadata?.tierBefore || null,
          metadata?.tierAfter || null,
          JSON.stringify(inputs),
          decision,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs for an applicant
   */
  async getAuditLogs(applicantId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM scoring_audit_logs 
         WHERE applicant_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [applicantId, limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        applicantId: row.applicant_id,
        action: row.action,
        scoreBefore: row.score_before,
        scoreAfter: row.score_after,
        tierBefore: row.tier_before,
        tierAfter: row.tier_after,
        inputs: row.inputs,
        decision: row.decision,
        timestamp: row.created_at,
      }));
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }
}

