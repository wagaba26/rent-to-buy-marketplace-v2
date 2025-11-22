import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { PaymentScheduleService } from '../services/paymentSchedule';
import { MobileMoneyService, MobileMoneyPaymentRequest } from '../services/mobileMoney';
import { PaymentRetryService } from '../services/paymentRetry';
import { IdempotencyService } from '../services/idempotency';

export function paymentRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient
): Router {
  const router = Router();

  // Initialize services
  const mobileMoneyService = new MobileMoneyService(
    {
      provider: (process.env.MOBILE_MONEY_PROVIDER as any) || 'mtn',
      apiKey: process.env.MOBILE_MONEY_API_KEY || '',
      apiSecret: process.env.MOBILE_MONEY_API_SECRET || '',
      callbackUrl: process.env.MOBILE_MONEY_CALLBACK_URL || 'http://localhost:3003/payments/callbacks/mobile-money',
      environment: (process.env.MOBILE_MONEY_ENV as any) || 'sandbox',
    },
    encryptionService
  );
  const retryService = new PaymentRetryService(pool);
  const idempotencyService = new IdempotencyService(pool);

  /**
   * Create payment plan based on vehicle price, deposit, and term length
   * POST /payments/plans
   */
  router.post('/plans', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        vehicleId,
        vehiclePrice,
        depositAmount,
        termLengthMonths,
        paymentFrequency,
        gracePeriodDays,
      } = req.body;

      if (!userId || !vehicleId || !vehiclePrice || !depositAmount || !termLengthMonths || !paymentFrequency) {
        throw new ValidationError('userId, vehicleId, vehiclePrice, depositAmount, termLengthMonths, and paymentFrequency are required');
      }

      if (![12, 18, 24, 36].includes(termLengthMonths)) {
        throw new ValidationError('termLengthMonths must be 12, 18, 24, or 36');
      }

      if (!['weekly', 'monthly'].includes(paymentFrequency)) {
        throw new ValidationError('paymentFrequency must be weekly or monthly');
      }

      // Calculate payment schedule
      const schedule = PaymentScheduleService.calculateSchedule({
        vehiclePrice,
        depositAmount,
        termLengthMonths,
        paymentFrequency,
        gracePeriodDays,
      });

      // Create payment plan
      const result = await pool.query(
        `INSERT INTO payment_plans (
          user_id, vehicle_id, vehicle_price, deposit_amount, installment_amount,
          payment_frequency, term_length_months, total_installments, remaining_installments,
          next_payment_date, grace_period_days, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
        RETURNING *`,
        [
          userId,
          vehicleId,
          schedule.totalAmount,
          schedule.depositAmount,
          schedule.installmentAmount,
          schedule.paymentFrequency,
          schedule.termLengthMonths,
          schedule.totalInstallments,
          schedule.remainingInstallments,
          schedule.nextPaymentDate,
          schedule.gracePeriodDays,
        ]
      );

      const plan = result.rows[0];

      // Publish payment plan created event
      await messageQueue.publish('payment.events', 'payment.plan.created', {
        type: 'payment.plan.created',
        payload: {
          planId: plan.id,
          userId: plan.user_id,
          vehicleId: plan.vehicle_id,
          installmentAmount: plan.installment_amount,
          termLengthMonths: plan.term_length_months,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: { plan },
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
   * Get payment plans for user
   * GET /payments/plans/user/:userId
   */
  router.get('/plans/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT * FROM payment_plans WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: { plans: result.rows },
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
   * Get outstanding balance for a payment plan
   * GET /payments/plans/:planId/balance
   */
  router.get('/plans/:planId/balance', async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const planResult = await pool.query('SELECT * FROM payment_plans WHERE id = $1', [planId]);

      if (planResult.rows.length === 0) {
        throw new NotFoundError('Payment plan');
      }

      const plan = planResult.rows[0];
      const outstandingBalance = PaymentScheduleService.calculateOutstandingBalance(
        plan.vehicle_price,
        plan.deposit_amount,
        plan.installment_amount,
        plan.total_installments,
        plan.remaining_installments
      );

      // Get total paid
      const paidResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid 
         FROM payments 
         WHERE payment_plan_id = $1 AND status = 'completed'`,
        [planId]
      );

      res.json({
        success: true,
        data: {
          planId: plan.id,
          totalAmount: plan.vehicle_price,
          depositAmount: plan.deposit_amount,
          totalPaid: parseFloat(paidResult.rows[0].total_paid),
          outstandingBalance,
          remainingInstallments: plan.remaining_installments,
          nextPaymentDate: plan.next_payment_date,
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
   * Make payment (with idempotency support)
   * POST /payments
   */
  router.post('/', async (req: Request, res: Response) => {
    let paymentId: string | undefined;
    try {
      const {
        paymentPlanId,
        userId,
        amount,
        paymentMethod,
        mobileMoneyProvider,
        phoneNumber,
        idempotencyKey,
        isDeposit = false,
      } = req.body;

      if (!paymentPlanId || !userId || !amount || !paymentMethod) {
        throw new ValidationError('paymentPlanId, userId, amount, and paymentMethod are required');
      }

      if (paymentMethod === 'mobile_money' && (!mobileMoneyProvider || !phoneNumber)) {
        throw new ValidationError('mobileMoneyProvider and phoneNumber are required for mobile money payments');
      }

      // Check idempotency key
      const idempotencyKeyToUse = idempotencyKey || IdempotencyService.generateIdempotencyKey();
      const idempotencyCheck = await idempotencyService.checkIdempotencyKey(idempotencyKeyToUse);
      
      if (idempotencyCheck.exists && idempotencyCheck.responseData) {
        return res.json({
          success: true,
          data: idempotencyCheck.responseData,
          idempotent: true,
        });
      }

      // Verify payment plan exists
      const planCheck = await pool.query('SELECT * FROM payment_plans WHERE id = $1 AND user_id = $2', [
        paymentPlanId,
        userId,
      ]);
      if (planCheck.rows.length === 0) {
        throw new NotFoundError('Payment plan');
      }

      const plan = planCheck.rows[0];
      if (plan.status !== 'active') {
        throw new ValidationError('Payment plan is not active');
      }

      // Encrypt phone number if provided
      const encryptedPhoneNumber = phoneNumber ? encryptionService.encrypt(phoneNumber) : null;

      // Create payment record
      const paymentResult = await pool.query(
        `INSERT INTO payments (
          payment_plan_id, user_id, amount, payment_method, mobile_money_provider,
          phone_number, encrypted_phone_number, idempotency_key, status, is_deposit, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', $9, $10)
        RETURNING *`,
        [
          paymentPlanId,
          userId,
          amount,
          paymentMethod,
          mobileMoneyProvider,
          phoneNumber,
          encryptedPhoneNumber,
          idempotencyKeyToUse,
          isDeposit,
          isDeposit ? null : plan.next_payment_date,
        ]
      );

      const payment = paymentResult.rows[0];
      paymentId = payment.id;

      // Process payment
      try {
        let externalTransactionId: string | undefined;

        if (paymentMethod === 'mobile_money') {
          const mobileMoneyRequest: MobileMoneyPaymentRequest = {
            amount,
            phoneNumber: phoneNumber!,
            provider: mobileMoneyProvider as any,
            reference: payment.id,
            description: isDeposit ? 'Vehicle deposit payment' : 'Vehicle installment payment',
          };

          const mobileMoneyResponse = await mobileMoneyService.initiatePayment(mobileMoneyRequest);

          if (!mobileMoneyResponse.success) {
            throw new Error(mobileMoneyResponse.message || 'Mobile money payment failed');
          }

          externalTransactionId = mobileMoneyResponse.externalTransactionId;

          // Update payment with external transaction ID
          await pool.query(
            `UPDATE payments SET external_transaction_id = $1 WHERE id = $2`,
            [externalTransactionId, payment.id]
          );
        }

        // Update payment status to completed
        await pool.query(
          `UPDATE payments SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [payment.id]
        );

        // Update payment plan if not a deposit
        if (!isDeposit) {
          const newRemaining = plan.remaining_installments - 1;
          const nextPaymentDate = PaymentScheduleService.calculateNextPaymentDate(
            new Date(plan.next_payment_date),
            plan.payment_frequency
          );
          const planStatus = newRemaining === 0 ? 'completed' : 'active';

          await pool.query(
            `UPDATE payment_plans 
             SET remaining_installments = $1, next_payment_date = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [newRemaining, nextPaymentDate, planStatus, paymentPlanId]
          );
        }

        // Store idempotency key
        const responseData = {
          payment: {
            ...payment,
            status: 'completed',
            external_transaction_id: externalTransactionId,
          },
        };
        await idempotencyService.storeIdempotencyKey(idempotencyKeyToUse, payment.id, responseData);

        // Publish payment completed event
        await messageQueue.publish('payment.events', 'payment.completed', {
          type: 'payment.completed',
          payload: {
            paymentId: payment.id,
            paymentPlanId: payment.payment_plan_id,
            userId: payment.user_id,
            amount: payment.amount,
            isDeposit,
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          data: responseData,
        });
      } catch (paymentError: any) {
        // Update payment status to failed
        await pool.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE id = $2`,
          [paymentError.message, payment.id]
        );

        // Schedule retry if not a deposit and retries available
        if (!isDeposit && payment.retry_count < payment.max_retries) {
          try {
            await retryService.scheduleRetry(payment.id, payment.retry_count);
          } catch (retryError) {
            console.error('Failed to schedule retry:', retryError);
          }
        }

        // Publish payment failed event
        await messageQueue.publish('payment.events', 'payment.failed', {
          type: 'payment.failed',
          payload: {
            paymentId: payment.id,
            paymentPlanId: payment.payment_plan_id,
            userId: payment.user_id,
            reason: paymentError.message,
          },
          timestamp: Date.now(),
        });

        throw paymentError;
      }
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
   * Mobile money callback endpoint
   * POST /payments/callbacks/mobile-money
   */
  router.post('/callbacks/mobile-money', async (req: Request, res: Response) => {
    try {
      const callback = req.body;

      // Process callback
      const callbackResult = await mobileMoneyService.processCallback(callback);

      if (!callbackResult.valid || !callbackResult.paymentId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid callback', code: 'INVALID_CALLBACK' },
        });
      }

      // Store callback
      await pool.query(
        `INSERT INTO mobile_money_callbacks (payment_id, provider, callback_data, status)
         VALUES ($1, $2, $3, 'received')
         RETURNING *`,
        [callbackResult.paymentId, callback.provider, JSON.stringify(callback)]
      );

      // Update payment based on callback status
      if (callback.status === 'success') {
        await pool.query(
          `UPDATE payments 
           SET status = 'completed', 
               external_transaction_id = $1,
               processed_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND status != 'completed'`,
          [callback.externalTransactionId, callbackResult.paymentId]
        );

        // Get payment details
        const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [callbackResult.paymentId]);
        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];

          // Update payment plan
          const planResult = await pool.query('SELECT * FROM payment_plans WHERE id = $1', [payment.payment_plan_id]);
          if (planResult.rows.length > 0 && !payment.is_deposit) {
            const plan = planResult.rows[0];
            const newRemaining = plan.remaining_installments - 1;
            const nextPaymentDate = PaymentScheduleService.calculateNextPaymentDate(
              new Date(plan.next_payment_date),
              plan.payment_frequency
            );
            const planStatus = newRemaining === 0 ? 'completed' : 'active';

            await pool.query(
              `UPDATE payment_plans 
               SET remaining_installments = $1, next_payment_date = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $4`,
              [newRemaining, nextPaymentDate, planStatus, payment.payment_plan_id]
            );
          }

          // Publish payment completed event
          await messageQueue.publish('payment.events', 'payment.completed', {
            type: 'payment.completed',
            payload: {
              paymentId: payment.id,
              paymentPlanId: payment.payment_plan_id,
              userId: payment.user_id,
              amount: payment.amount,
            },
            timestamp: Date.now(),
          });
        }
      } else {
        await pool.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE id = $2`,
          [callback.message || 'Payment failed', callbackResult.paymentId]
        );

        // Publish payment failed event
        await messageQueue.publish('payment.events', 'payment.failed', {
          type: 'payment.failed',
          payload: {
            paymentId: callbackResult.paymentId,
            reason: callback.message || 'Payment failed',
          },
          timestamp: Date.now(),
        });
      }

      // Mark callback as processed
      await pool.query(
        `UPDATE mobile_money_callbacks SET status = 'processed', processed_at = CURRENT_TIMESTAMP 
         WHERE payment_id = $1`,
        [callbackResult.paymentId]
      );

      res.json({ success: true, message: 'Callback processed' });
    } catch (error: any) {
      console.error('Error processing callback:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Callback processing failed', code: 'CALLBACK_ERROR' },
      });
    }
  });

  /**
   * Get payment history
   * GET /payments/history/:userId
   */
  router.get('/history/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0, status, paymentPlanId } = req.query;

      let query = `SELECT * FROM payments WHERE user_id = $1`;
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (paymentPlanId) {
        query += ` AND payment_plan_id = $${paramIndex}`;
        params.push(paymentPlanId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          payments: result.rows,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            count: result.rows.length,
          },
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
   * Get outstanding balance for user
   * GET /payments/balance/:userId
   */
  router.get('/balance/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Get all active payment plans for user
      const plansResult = await pool.query(
        `SELECT * FROM payment_plans WHERE user_id = $1 AND status IN ('active', 'overdue')`,
        [userId]
      );

      let totalOutstanding = 0;
      const planBalances: any[] = [];

      for (const plan of plansResult.rows) {
        const balance = PaymentScheduleService.calculateOutstandingBalance(
          plan.vehicle_price,
          plan.deposit_amount,
          plan.installment_amount,
          plan.total_installments,
          plan.remaining_installments
        );
        totalOutstanding += balance;

        planBalances.push({
          planId: plan.id,
          vehicleId: plan.vehicle_id,
          outstandingBalance: balance,
          remainingInstallments: plan.remaining_installments,
          nextPaymentDate: plan.next_payment_date,
          status: plan.status,
        });
      }

      res.json({
        success: true,
        data: {
          userId,
          totalOutstandingBalance: totalOutstanding,
          plans: planBalances,
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

  return router;
}
