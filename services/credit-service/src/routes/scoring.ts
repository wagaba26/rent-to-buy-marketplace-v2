import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ValidationError, NotFoundError } from '@rent-to-own/errors';
import { ScoringEngine } from '../services/scoringEngine';
import { AuditLogger } from '../services/auditLogger';
import { ApplicantData, ScoreUpdateData } from '../types/scoring';

export function scoringRoutes(pool: Pool): Router {
  const router = Router();
  const auditLogger = new AuditLogger(pool);

  /**
   * POST /scoreApplicant
   * Score a new applicant or recalculate existing applicant's score
   */
  router.post('/scoreApplicant', async (req: Request, res: Response) => {
    try {
      const { applicantId, applicantData } = req.body;

      if (!applicantId) {
        throw new ValidationError('applicantId is required');
      }

      if (!applicantData || !applicantData.personalInfo) {
        throw new ValidationError('applicantData with personalInfo is required');
      }

      // Validate applicant data structure
      const data: ApplicantData = {
        personalInfo: applicantData.personalInfo,
        mobileMoneyHistory: applicantData.mobileMoneyHistory,
        utilityPayments: applicantData.utilityPayments,
        saccoContributions: applicantData.saccoContributions,
        priorLoanPerformance: applicantData.priorLoanPerformance,
      };

      // Store or update applicant data
      await pool.query(
        `INSERT INTO applicant_data (applicant_id, personal_info, mobile_money_history, utility_payments, sacco_contributions, prior_loan_performance, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (applicant_id) 
         DO UPDATE SET 
           personal_info = EXCLUDED.personal_info,
           mobile_money_history = EXCLUDED.mobile_money_history,
           utility_payments = EXCLUDED.utility_payments,
           sacco_contributions = EXCLUDED.sacco_contributions,
           prior_loan_performance = EXCLUDED.prior_loan_performance,
           updated_at = CURRENT_TIMESTAMP`,
        [
          applicantId,
          JSON.stringify(data.personalInfo),
          data.mobileMoneyHistory ? JSON.stringify(data.mobileMoneyHistory) : null,
          data.utilityPayments ? JSON.stringify(data.utilityPayments) : null,
          data.saccoContributions ? JSON.stringify(data.saccoContributions) : null,
          data.priorLoanPerformance ? JSON.stringify(data.priorLoanPerformance) : null,
        ]
      );

      // Calculate credit score
      const scoreResult = ScoringEngine.calculateScore(applicantId, data);

      // Get existing score if any
      const existingScoreResult = await pool.query(
        'SELECT score, tier FROM credit_scores WHERE applicant_id = $1',
        [applicantId]
      );

      const scoreBefore = existingScoreResult.rows[0]?.score || null;
      const tierBefore = existingScoreResult.rows[0]?.tier || null;

      // Store or update credit score
      await pool.query(
        `INSERT INTO credit_scores 
         (applicant_id, score, tier, factors, maximum_vehicle_value, required_deposit_percentage, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (applicant_id)
         DO UPDATE SET
           score = EXCLUDED.score,
           tier = EXCLUDED.tier,
           factors = EXCLUDED.factors,
           maximum_vehicle_value = EXCLUDED.maximum_vehicle_value,
           required_deposit_percentage = EXCLUDED.required_deposit_percentage,
           last_updated = CURRENT_TIMESTAMP`,
        [
          applicantId,
          scoreResult.score,
          scoreResult.tier,
          JSON.stringify(scoreResult.factors),
          scoreResult.maximumVehicleValue,
          scoreResult.requiredDepositPercentage,
        ]
      );

      // Log the scoring action
      const action = scoreBefore === null ? 'score_calculated' : 'score_updated';
      const decision = `Score calculated: ${scoreResult.score} (Tier ${scoreResult.tier}). Max vehicle value: ${scoreResult.maximumVehicleValue}, Deposit: ${scoreResult.requiredDepositPercentage}%`;

      await auditLogger.logAction(
        applicantId,
        action,
        { applicantData: data },
        decision,
        {
          scoreBefore: scoreBefore || undefined,
          scoreAfter: scoreResult.score,
          tierBefore: tierBefore || undefined,
          tierAfter: scoreResult.tier,
        }
      );

      res.status(200).json({
        success: true,
        data: {
          applicantId: scoreResult.applicantId,
          score: scoreResult.score,
          tier: scoreResult.tier,
          factors: scoreResult.factors,
          maximumVehicleValue: parseFloat(scoreResult.maximumVehicleValue.toString()),
          requiredDepositPercentage: parseFloat(scoreResult.requiredDepositPercentage.toString()),
          calculatedAt: scoreResult.calculatedAt,
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  /**
   * POST /updateScore
   * Update an applicant's score based on new repayment or telematics data
   */
  router.post('/updateScore', async (req: Request, res: Response) => {
    try {
      const { applicantId, updateType, data } = req.body;

      if (!applicantId || !updateType || !data) {
        throw new ValidationError('applicantId, updateType, and data are required');
      }

      if (!['repayment', 'telematics', 'payment', 'manual'].includes(updateType)) {
        throw new ValidationError('updateType must be one of: repayment, telematics, payment, manual');
      }

      // Get current score
      const currentScoreResult = await pool.query(
        'SELECT score, tier FROM credit_scores WHERE applicant_id = $1',
        [applicantId]
      );

      if (currentScoreResult.rows.length === 0) {
        throw new NotFoundError('Credit score not found. Please score the applicant first.');
      }

      const currentScore = currentScoreResult.rows[0].score;
      const currentTier = currentScoreResult.rows[0].tier;

      // Calculate score update
      const updateData: ScoreUpdateData = {
        applicantId,
        updateType,
        data,
      };

      const { newScore, newTier, adjustment } = ScoringEngine.updateScore(
        currentScore,
        currentTier,
        updateData
      );

      // Update credit score
      const tierConfig = ScoringEngine.getTierConfig(newTier);
      if (!tierConfig) {
        throw new Error(`Invalid tier: ${newTier}`);
      }

      await pool.query(
        `UPDATE credit_scores 
         SET score = $1, tier = $2, maximum_vehicle_value = $3, required_deposit_percentage = $4, last_updated = CURRENT_TIMESTAMP
         WHERE applicant_id = $5`,
        [
          newScore,
          newTier,
          tierConfig.maxVehicleValue,
          tierConfig.depositPercentage,
          applicantId,
        ]
      );

      // Record score update history
      await pool.query(
        `INSERT INTO score_updates 
         (applicant_id, update_type, score_before, score_after, tier_before, tier_after, adjustment, update_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          applicantId,
          updateType,
          currentScore,
          newScore,
          currentTier,
          newTier,
          adjustment,
          JSON.stringify(data),
        ]
      );

      // Log the update
      const decision = `Score updated from ${currentScore} to ${newScore} (${adjustment > 0 ? '+' : ''}${adjustment}). Tier: ${currentTier} → ${newTier}`;
      await auditLogger.logAction(
        applicantId,
        'score_updated',
        { updateType, data },
        decision,
        {
          scoreBefore: currentScore,
          scoreAfter: newScore,
          tierBefore: currentTier,
          tierAfter: newTier,
        }
      );

      res.status(200).json({
        success: true,
        data: {
          applicantId,
          scoreBefore: currentScore,
          scoreAfter: newScore,
          tierBefore: currentTier,
          tierAfter: newTier,
          adjustment,
          maximumVehicleValue: parseFloat(tierConfig.maxVehicleValue.toString()),
          requiredDepositPercentage: parseFloat(tierConfig.depositPercentage.toString()),
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  /**
   * GET /getTier/:applicantId
   * Get the current tier and associated configuration for an applicant
   */
  router.get('/getTier/:applicantId', async (req: Request, res: Response) => {
    try {
      const { applicantId } = req.params;

      const scoreResult = await pool.query(
        'SELECT * FROM credit_scores WHERE applicant_id = $1',
        [applicantId]
      );

      if (scoreResult.rows.length === 0) {
        throw new NotFoundError('Credit score not found. Please score the applicant first.');
      }

      const score = scoreResult.rows[0];
      const tierConfig = ScoringEngine.getTierConfig(score.tier);

      if (!tierConfig) {
        throw new Error(`Invalid tier configuration for tier: ${score.tier}`);
      }

      res.status(200).json({
        success: true,
        data: {
          applicantId,
          tier: score.tier,
          score: score.score,
          tierConfiguration: {
            tier: tierConfig.tier,
            minScore: tierConfig.minScore,
            maxScore: tierConfig.maxScore,
            maxVehicleValue: parseFloat(tierConfig.maxVehicleValue.toString()),
            depositPercentage: parseFloat(tierConfig.depositPercentage.toString()),
            vehicleCategories: tierConfig.vehicleCategories,
          },
          maximumVehicleValue: parseFloat(score.maximum_vehicle_value.toString()),
          requiredDepositPercentage: parseFloat(score.required_deposit_percentage.toString()),
          lastUpdated: score.last_updated,
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  /**
   * GET /score/:applicantId
   * Get current credit score for an applicant
   */
  router.get('/score/:applicantId', async (req: Request, res: Response) => {
    try {
      const { applicantId } = req.params;

      const result = await pool.query(
        'SELECT * FROM credit_scores WHERE applicant_id = $1',
        [applicantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Credit score not found');
      }

      const score = result.rows[0];

      res.status(200).json({
        success: true,
        data: {
          applicantId: score.applicant_id,
          score: score.score,
          tier: score.tier,
          factors: score.factors,
          maximumVehicleValue: parseFloat(score.maximum_vehicle_value.toString()),
          requiredDepositPercentage: parseFloat(score.required_deposit_percentage.toString()),
          lastUpdated: score.last_updated,
          createdAt: score.created_at,
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  /**
   * GET /auditLogs/:applicantId
   * Get audit logs for an applicant (for debugging and compliance)
   */
  router.get('/auditLogs/:applicantId', async (req: Request, res: Response) => {
    try {
      const { applicantId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const logs = await auditLogger.getAuditLogs(applicantId, limit);

      res.status(200).json({
        success: true,
        data: { logs },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  return router;
}

