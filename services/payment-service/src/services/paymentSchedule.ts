/**
 * Payment Schedule Calculation Service
 * Creates payment schedules based on vehicle price, deposit, and term length
 */

export interface PaymentScheduleInput {
  vehiclePrice: number;
  depositAmount: number;
  termLengthMonths: 12 | 18 | 24 | 36;
  paymentFrequency: 'weekly' | 'monthly';
  gracePeriodDays?: number;
}

export interface PaymentSchedule {
  totalAmount: number;
  depositAmount: number;
  installmentAmount: number;
  paymentFrequency: 'weekly' | 'monthly';
  termLengthMonths: 12 | 18 | 24 | 36;
  totalInstallments: number;
  remainingInstallments: number;
  nextPaymentDate: Date;
  gracePeriodDays: number;
}

export class PaymentScheduleService {
  /**
   * Calculate payment schedule based on vehicle price, deposit, and term length
   */
  static calculateSchedule(input: PaymentScheduleInput): PaymentSchedule {
    const { vehiclePrice, depositAmount, termLengthMonths, paymentFrequency, gracePeriodDays = 7 } = input;

    // Validate inputs
    if (depositAmount >= vehiclePrice) {
      throw new Error('Deposit amount must be less than vehicle price');
    }

    if (![12, 18, 24, 36].includes(termLengthMonths)) {
      throw new Error('Term length must be 12, 18, 24, or 36 months');
    }

    // Calculate the amount to be paid in installments
    const installmentTotal = vehiclePrice - depositAmount;

    // Calculate number of installments based on frequency
    let totalInstallments: number;
    if (paymentFrequency === 'monthly') {
      totalInstallments = termLengthMonths;
    } else {
      // Weekly: 52 weeks per year, so termLengthMonths * (52/12) = termLengthMonths * 4.33
      totalInstallments = Math.ceil(termLengthMonths * (52 / 12));
    }

    // Calculate installment amount (rounded to 2 decimal places)
    const installmentAmount = Math.round((installmentTotal / totalInstallments) * 100) / 100;

    // Calculate next payment date (30 days from now for monthly, 7 days for weekly)
    const nextPaymentDate = new Date();
    if (paymentFrequency === 'monthly') {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else {
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
    }

    return {
      totalAmount: vehiclePrice,
      depositAmount,
      installmentAmount,
      paymentFrequency,
      termLengthMonths,
      totalInstallments,
      remainingInstallments: totalInstallments,
      nextPaymentDate,
      gracePeriodDays,
    };
  }

  /**
   * Calculate outstanding balance for a payment plan
   */
  static calculateOutstandingBalance(
    totalAmount: number,
    depositAmount: number,
    installmentAmount: number,
    totalInstallments: number,
    remainingInstallments: number
  ): number {
    const paidInstallments = totalInstallments - remainingInstallments;
    const paidAmount = depositAmount + (paidInstallments * installmentAmount);
    return Math.max(0, totalAmount - paidAmount);
  }

  /**
   * Calculate next payment date based on frequency
   */
  static calculateNextPaymentDate(currentDate: Date, frequency: 'weekly' | 'monthly'): Date {
    const nextDate = new Date(currentDate);
    if (frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  }

  /**
   * Calculate due date with grace period
   */
  static calculateDueDateWithGrace(scheduledDate: Date, gracePeriodDays: number): Date {
    const dueDate = new Date(scheduledDate);
    dueDate.setDate(dueDate.getDate() + gracePeriodDays);
    return dueDate;
  }

  /**
   * Calculate days overdue
   */
  static calculateDaysOverdue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}

