import { Pool } from 'pg';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { PaymentScheduleService } from '../services/paymentSchedule';
import { MobileMoneyService, MobileMoneyPaymentRequest } from '../services/mobileMoney';
import { PaymentRetryService } from '../services/paymentRetry';

export async function schedulePayments(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient
): Promise<void> {
  try {
    // 1. Process due payments
    await processDuePayments(pool, encryptionService, messageQueue);

    // 2. Process retries
    await processPaymentRetries(pool, encryptionService, messageQueue);

    // 3. Check for overdue payments
    await checkOverduePayments(pool, messageQueue);

    console.log('Payment scheduler completed');
  } catch (error) {
    console.error('Error in payment scheduler:', error);
    throw error;
  }
}

/**
 * Process payments that are due today
 */
async function processDuePayments(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT pp.*, p.payment_method, p.mobile_money_provider, p.encrypted_phone_number, p.id as last_payment_id
     FROM payment_plans pp
     LEFT JOIN LATERAL (
       SELECT payment_method, mobile_money_provider, encrypted_phone_number, id
       FROM payments
       WHERE payment_plan_id = pp.id
       ORDER BY created_at DESC
       LIMIT 1
     ) p ON true
     WHERE pp.status = 'active' 
       AND pp.next_payment_date <= $1 
       AND pp.remaining_installments > 0`,
    [today]
  );

  console.log(`Found ${result.rows.length} payments due today`);

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

  for (const plan of result.rows) {
    try {
      // Check if payment already exists for this due date
      const existingPayment = await pool.query(
        `SELECT * FROM payments 
         WHERE payment_plan_id = $1 
           AND scheduled_date = $2 
           AND status IN ('pending', 'processing', 'completed')`,
        [plan.id, today]
      );

      if (existingPayment.rows.length > 0) {
        console.log(`Payment already exists for plan ${plan.id} on ${today}`);
        continue;
      }

      if (!plan.payment_method || !plan.encrypted_phone_number) {
        console.log(`No payment method found for plan ${plan.id}`);
        continue;
      }

      const phoneNumber = encryptionService.decrypt(plan.encrypted_phone_number);

      // Calculate due date with grace period
      const scheduledDate = new Date(plan.next_payment_date);
      const dueDate = PaymentScheduleService.calculateDueDateWithGrace(
        scheduledDate,
        plan.grace_period_days
      );

      // Create scheduled payment
      const scheduledPayment = await pool.query(
        `INSERT INTO payments (
          payment_plan_id, user_id, amount, payment_method, 
          mobile_money_provider, encrypted_phone_number, 
          scheduled_date, due_date, status, max_retries
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 3)
        RETURNING *`,
        [
          plan.id,
          plan.user_id,
          plan.installment_amount,
          plan.payment_method,
          plan.mobile_money_provider,
          plan.encrypted_phone_number,
          scheduledDate,
          dueDate,
        ]
      );

      const payment = scheduledPayment.rows[0];

      // Attempt automatic collection
      try {
        if (plan.payment_method === 'mobile_money') {
          const mobileMoneyRequest: MobileMoneyPaymentRequest = {
            amount: plan.installment_amount,
            phoneNumber,
            provider: plan.mobile_money_provider as any,
            reference: payment.id,
            description: `Vehicle installment payment - Plan ${plan.id}`,
          };

          const mobileMoneyResponse = await mobileMoneyService.initiatePayment(mobileMoneyRequest);

          if (!mobileMoneyResponse.success) {
            throw new Error(mobileMoneyResponse.message || 'Mobile money payment failed');
          }

          // Update payment with external transaction ID
          await pool.query(
            `UPDATE payments SET 
             external_transaction_id = $1,
             status = 'processing'
             WHERE id = $2`,
            [mobileMoneyResponse.externalTransactionId, payment.id]
          );

          // Note: Payment will be confirmed via callback
          // For now, we'll wait for the callback to complete the payment
          console.log(`Payment initiated for plan ${plan.id}, waiting for callback`);
        } else {
          // For other payment methods, mark as completed immediately
          await pool.query(
            `UPDATE payments SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [payment.id]
          );

          await updatePaymentPlanAfterSuccess(pool, plan, payment);
        }
      } catch (paymentError: any) {
        // Update payment status to failed
        await pool.query(
          `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE id = $2`,
          [paymentError.message, payment.id]
        );

        // Schedule retry
        const retryService = new PaymentRetryService(pool);
        try {
          await retryService.scheduleRetry(payment.id, 0);
        } catch (retryError) {
          console.error(`Failed to schedule retry for payment ${payment.id}:`, retryError);
        }

        // Publish payment failed event
        await messageQueue.publish('payment.events', 'payment.failed', {
          type: 'payment.failed',
          payload: {
            paymentId: payment.id,
            paymentPlanId: plan.id,
            userId: plan.user_id,
            reason: paymentError.message,
          },
          timestamp: Date.now(),
        });

        console.error(`Failed to process payment for plan ${plan.id}:`, paymentError.message);
      }
    } catch (error) {
      console.error(`Error processing plan ${plan.id}:`, error);
    }
  }
}

/**
 * Process payment retries
 */
async function processPaymentRetries(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient
): Promise<void> {
  const retryService = new PaymentRetryService(pool);
  const paymentsDueForRetry = await retryService.getPaymentsDueForRetry(100);

  console.log(`Found ${paymentsDueForRetry.length} payments due for retry`);

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

  for (const payment of paymentsDueForRetry) {
    try {
      // Mark retry as processing
      await retryService.markRetryProcessing(payment.id, payment.retry_count + 1);

      // Get payment plan
      const planResult = await pool.query('SELECT * FROM payment_plans WHERE id = $1', [payment.payment_plan_id]);
      if (planResult.rows.length === 0) {
        throw new Error('Payment plan not found');
      }
      const plan = planResult.rows[0];

      // Get phone number
      const phoneNumber = payment.encrypted_phone_number
        ? encryptionService.decrypt(payment.encrypted_phone_number)
        : null;

      if (!phoneNumber || payment.payment_method !== 'mobile_money') {
        throw new Error('Invalid payment method for retry');
      }

      // Attempt retry
      const mobileMoneyRequest: MobileMoneyPaymentRequest = {
        amount: payment.amount,
        phoneNumber,
        provider: payment.mobile_money_provider as any,
        reference: payment.id,
        description: `Retry payment - ${payment.id}`,
      };

      const mobileMoneyResponse = await mobileMoneyService.initiatePayment(mobileMoneyRequest);

      if (mobileMoneyResponse.success) {
        // Update payment
        await pool.query(
          `UPDATE payments SET 
           external_transaction_id = $1,
           status = 'processing',
           next_retry_at = NULL
           WHERE id = $2`,
          [mobileMoneyResponse.externalTransactionId, payment.id]
        );

        // Mark retry as completed (will be confirmed via callback)
        await retryService.markRetryCompleted(payment.id, payment.retry_count + 1);

        console.log(`Retry initiated for payment ${payment.id}`);
      } else {
        throw new Error(mobileMoneyResponse.message || 'Retry payment failed');
      }
    } catch (error: any) {
      // Mark retry as failed
      await retryService.markRetryFailed(payment.id, payment.retry_count + 1, error.message);

      // Check if we should schedule another retry
      if (payment.retry_count + 1 < payment.max_retries) {
        try {
          await retryService.scheduleRetry(payment.id, payment.retry_count + 1);
        } catch (retryError) {
          console.error(`Failed to schedule next retry for payment ${payment.id}:`, retryError);
        }
      } else {
        console.log(`Max retries reached for payment ${payment.id}`);
      }

      console.error(`Retry failed for payment ${payment.id}:`, error.message);
    }
  }
}

/**
 * Check for overdue payments and update status
 */
async function checkOverduePayments(pool: Pool, messageQueue: MessageQueueClient): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find payments that are past their due date (including grace period)
  const overdueResult = await pool.query(
    `SELECT p.*, pp.user_id, pp.vehicle_id, pp.grace_period_days
     FROM payments p
     JOIN payment_plans pp ON p.payment_plan_id = pp.id
     WHERE p.status IN ('pending', 'failed')
       AND p.due_date < $1
       AND pp.status = 'active'`,
    [today]
  );

  console.log(`Found ${overdueResult.rows.length} overdue payments`);

  for (const payment of overdueResult.rows) {
    try {
      // Calculate days overdue
      const daysOverdue = PaymentScheduleService.calculateDaysOverdue(new Date(payment.due_date));

      // Update payment plan overdue status
      await pool.query(
        `UPDATE payment_plans 
         SET status = 'overdue',
             overdue_days = $1,
             last_overdue_check = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [daysOverdue, payment.payment_plan_id]
      );

      // Publish overdue event
      await messageQueue.publish('payment.events', 'payment.overdue', {
        type: 'payment.overdue',
        payload: {
          paymentId: payment.id,
          paymentPlanId: payment.payment_plan_id,
          userId: payment.user_id,
          vehicleId: payment.vehicle_id,
          amount: payment.amount,
          daysOverdue,
          dueDate: payment.due_date,
        },
        timestamp: Date.now(),
      });

      // If severely overdue (more than 30 days), trigger vehicle immobilization
      if (daysOverdue > 30) {
        await messageQueue.publish('telematics.events', 'vehicle.immobilize', {
          type: 'vehicle.immobilize',
          payload: {
            vehicleId: payment.vehicle_id,
            userId: payment.user_id,
            reason: 'Payment severely overdue',
            daysOverdue,
          },
          timestamp: Date.now(),
        });
      }

      console.log(`Marked payment ${payment.id} as overdue (${daysOverdue} days)`);
    } catch (error) {
      console.error(`Error processing overdue payment ${payment.id}:`, error);
    }
  }
}

/**
 * Update payment plan after successful payment
 */
async function updatePaymentPlanAfterSuccess(pool: Pool, plan: any, payment: any): Promise<void> {
  const newRemaining = plan.remaining_installments - 1;
  const nextPaymentDate = PaymentScheduleService.calculateNextPaymentDate(
    new Date(plan.next_payment_date),
    plan.payment_frequency
  );
  const planStatus = newRemaining === 0 ? 'completed' : 'active';

  await pool.query(
    `UPDATE payment_plans 
     SET remaining_installments = $1, 
         next_payment_date = $2, 
         status = $3,
         overdue_days = 0,
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $4`,
    [newRemaining, nextPaymentDate, planStatus, plan.id]
  );

  // Publish payment completed event
  await pool.query(
    `SELECT * FROM payments WHERE id = $1`,
    [payment.id]
  ).then(async (result) => {
    if (result.rows.length > 0) {
      const completedPayment = result.rows[0];
      // Event will be published by the route handler or callback handler
    }
  });
}
