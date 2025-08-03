
import { db } from '../db';
import { paymentSchedulesTable, transactionsTable } from '../db/schema';
import { type ProcessPaymentInput, type PaymentSchedule } from '../schema';
import { eq } from 'drizzle-orm';

export const processPayment = async (input: ProcessPaymentInput): Promise<PaymentSchedule> => {
  try {
    // First, get the payment schedule
    const schedules = await db.select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, input.schedule_id))
      .execute();

    if (schedules.length === 0) {
      throw new Error('Payment schedule not found');
    }

    const schedule = schedules[0];

    // Check if already fully paid
    const currentPaidAmount = parseFloat(schedule.paid_amount);
    const totalAmount = parseFloat(schedule.total_amount);
    
    if (currentPaidAmount >= totalAmount) {
      throw new Error('Payment schedule is already fully paid');
    }

    // Calculate new paid amount
    const newPaidAmount = currentPaidAmount + input.amount;

    // Calculate late fee if payment is overdue and not already calculated
    let lateFee = parseFloat(schedule.late_fee);
    const today = new Date();
    const dueDate = new Date(schedule.due_date);
    
    if (today > dueDate && schedule.status === 'PENDING' && lateFee === 0) {
      // Simple late fee calculation: 1% of total amount per month overdue
      const monthsOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      lateFee = totalAmount * 0.01 * monthsOverdue;
    }

    // Determine new status based on original total amount (not including late fee for PAID status)
    let newStatus: 'PENDING' | 'PAID' | 'LATE' | 'MISSED' = 'PENDING';
    const paidDate = newPaidAmount >= totalAmount ? new Date() : null;
    
    if (newPaidAmount >= totalAmount) {
      newStatus = 'PAID';
    } else if (today > dueDate) {
      newStatus = 'LATE';
    }

    // Update payment schedule
    const updatedSchedules = await db.update(paymentSchedulesTable)
      .set({
        paid_amount: newPaidAmount.toString(),
        paid_date: paidDate,
        status: newStatus,
        late_fee: lateFee.toString()
      })
      .where(eq(paymentSchedulesTable.id, input.schedule_id))
      .returning()
      .execute();

    const updatedSchedule = updatedSchedules[0];

    // Convert numeric fields back to numbers
    return {
      ...updatedSchedule,
      principal_amount: parseFloat(updatedSchedule.principal_amount),
      interest_amount: parseFloat(updatedSchedule.interest_amount),
      total_amount: parseFloat(updatedSchedule.total_amount),
      paid_amount: parseFloat(updatedSchedule.paid_amount),
      late_fee: parseFloat(updatedSchedule.late_fee)
    };
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};
