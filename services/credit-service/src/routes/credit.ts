import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { calculateCreditScore } from '../services/creditScoring';

export function creditRoutes(pool: Pool, messageQueue: MessageQueueClient): Router {
  const router = Router();

  // Calculate or get credit score
  router.get('/score/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { recalculate } = req.query;

      let result = await pool.query('SELECT * FROM credit_scores WHERE user_id = $1', [userId]);

      if (result.rows.length === 0 || recalculate === 'true') {
        // Calculate new credit score
        const scoreData = await calculateCreditScore(pool, userId);

        if (result.rows.length === 0) {
          // Create new credit score
          result = await pool.query(
            `INSERT INTO credit_scores (user_id, score, risk_level, factors, alternative_data, behavioral_signals)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              userId,
              scoreData.score,
              scoreData.riskLevel,
              JSON.stringify(scoreData.factors),
              JSON.stringify(scoreData.alternativeData || {}),
              JSON.stringify(scoreData.behavioralSignals || {}),
            ]
          );
        } else {
          // Update existing credit score
          result = await pool.query(
            `UPDATE credit_scores 
             SET score = $1, risk_level = $2, factors = $3, alternative_data = $4, behavioral_signals = $5, last_updated = CURRENT_TIMESTAMP
             WHERE user_id = $6
             RETURNING *`,
            [
              scoreData.score,
              scoreData.riskLevel,
              JSON.stringify(scoreData.factors),
              JSON.stringify(scoreData.alternativeData || {}),
              JSON.stringify(scoreData.behavioralSignals || {}),
              userId,
            ]
          );
        }
      }

      res.json({
        success: true,
        data: { creditScore: result.rows[0] },
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

  // Assess credit for vehicle purchase
  router.post('/assess', async (req: Request, res: Response) => {
    try {
      const { userId, vehicleId, requestedAmount } = req.body;

      if (!userId || !vehicleId || !requestedAmount) {
        throw new ValidationError('userId, vehicleId, and requestedAmount are required');
      }

      // Get credit score
      const scoreResult = await pool.query('SELECT * FROM credit_scores WHERE user_id = $1', [userId]);
      if (scoreResult.rows.length === 0) {
        throw new NotFoundError('Credit score');
      }

      const creditScore = scoreResult.rows[0];
      let assessmentResult = 'rejected';
      const conditions: any = {};

      // Assessment logic based on credit score and risk level
      if (creditScore.risk_level === 'low' && creditScore.score >= 700) {
        assessmentResult = 'approved';
      } else if (creditScore.risk_level === 'medium' && creditScore.score >= 600) {
        assessmentResult = 'conditional';
        conditions.requiredDeposit = requestedAmount * 0.3; // 30% deposit
        conditions.monthlyPaymentLimit = requestedAmount * 0.1; // 10% of total per month
      } else if (creditScore.risk_level === 'high' || creditScore.score < 500) {
        assessmentResult = 'rejected';
        conditions.reason = 'Credit score too low or high risk level';
      } else {
        assessmentResult = 'conditional';
        conditions.requiredDeposit = requestedAmount * 0.4; // 40% deposit
        conditions.monthlyPaymentLimit = requestedAmount * 0.08; // 8% of total per month
      }

      // Create assessment record
      const assessmentResult_query = await pool.query(
        `INSERT INTO credit_assessments (user_id, vehicle_id, requested_amount, assessment_result, credit_score_id, conditions)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, vehicleId, requestedAmount, assessmentResult, creditScore.id, JSON.stringify(conditions)]
      );

      const assessment = assessmentResult_query.rows[0];

      // Publish assessment event
      if (assessmentResult === 'approved') {
        await messageQueue.publish('credit.events', 'credit.approved', {
          type: 'credit.approved',
          payload: {
            assessmentId: assessment.id,
            userId: assessment.user_id,
            vehicleId: assessment.vehicle_id,
            requestedAmount: assessment.requested_amount,
          },
          timestamp: Date.now(),
        });
      }

      res.status(201).json({
        success: true,
        data: { assessment },
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

  // Get assessment history
  router.get('/assessments/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT * FROM credit_assessments WHERE user_id = $1 ORDER BY assessed_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: { assessments: result.rows },
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

