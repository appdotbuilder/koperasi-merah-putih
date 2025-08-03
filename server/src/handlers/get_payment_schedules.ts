
import { db } from '../db';
import { paymentSchedulesTable } from '../db/schema';
import { type PaymentSchedule } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getPaymentSchedules(loanId: number): Promise<PaymentSchedule[]> {
  try {
    const results = await db.select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.loan_id, loanId))
      .orderBy(asc(paymentSchedulesTable.installment_number))
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(schedule => ({
      ...schedule,
      principal_amount: parseFloat(schedule.principal_amount),
      interest_amount: parseFloat(schedule.interest_amount),
      total_amount: parseFloat(schedule.total_amount),
      paid_amount: parseFloat(schedule.paid_amount),
      late_fee: parseFloat(schedule.late_fee)
    }));
  } catch (error) {
    console.error('Failed to fetch payment schedules:', error);
    throw error;
  }
}
