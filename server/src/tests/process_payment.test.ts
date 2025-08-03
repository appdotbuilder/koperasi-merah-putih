
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, loansTable, paymentSchedulesTable } from '../db/schema';
import { type ProcessPaymentInput } from '../schema';
import { processPayment } from '../handlers/process_payment';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const users = await db.insert(usersTable)
    .values({
      member_number: 'M001',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      identity_number: 'ID001',
      role: 'MEMBER',
      status: 'ACTIVE'
    })
    .returning()
    .execute();
  return users[0];
};

const createTestLoan = async (userId: number) => {
  const loans = await db.insert(loansTable)
    .values({
      user_id: userId,
      amount: '10000',
      interest_rate: '12',
      term_months: 12,
      monthly_payment: '900',
      remaining_balance: '10000',
      status: 'ACTIVE'
    })
    .returning()
    .execute();
  return loans[0];
};

const createTestPaymentSchedule = async (loanId: number, overdue: boolean = false) => {
  const dueDate = new Date();
  if (overdue) {
    dueDate.setMonth(dueDate.getMonth() - 2); // 2 months overdue
  } else {
    dueDate.setMonth(dueDate.getMonth() + 1); // Due next month
  }

  const schedules = await db.insert(paymentSchedulesTable)
    .values({
      loan_id: loanId,
      installment_number: 1,
      due_date: dueDate,
      principal_amount: '800',
      interest_amount: '100',
      total_amount: '900',
      paid_amount: '0',
      status: 'PENDING',
      late_fee: '0'
    })
    .returning()
    .execute();
  return schedules[0];
};

describe('processPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process partial payment successfully', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id);

    const input: ProcessPaymentInput = {
      schedule_id: schedule.id,
      amount: 500,
      payment_method: 'bank_transfer',
      notes: 'Partial payment'
    };

    const result = await processPayment(input);

    expect(result.id).toEqual(schedule.id);
    expect(result.paid_amount).toEqual(500);
    expect(result.status).toEqual('PENDING');
    expect(result.paid_date).toBeNull();
    expect(typeof result.paid_amount).toBe('number');
    expect(typeof result.total_amount).toBe('number');
  });

  it('should process full payment and mark as paid', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id);

    const input: ProcessPaymentInput = {
      schedule_id: schedule.id,
      amount: 900,
      payment_method: 'cash',
      notes: 'Full payment'
    };

    const result = await processPayment(input);

    expect(result.paid_amount).toEqual(900);
    expect(result.status).toEqual('PAID');
    expect(result.paid_date).toBeInstanceOf(Date);
    expect(result.late_fee).toEqual(0);
  });

  it('should calculate late fee for overdue payment', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id, true); // Create overdue schedule

    const input: ProcessPaymentInput = {
      schedule_id: schedule.id,
      amount: 900,
      payment_method: 'bank_transfer'
    };

    const result = await processPayment(input);

    expect(result.status).toEqual('PAID'); // Should be PAID since full amount was paid
    expect(result.late_fee).toBeGreaterThan(0);
    expect(typeof result.late_fee).toBe('number');
    expect(result.paid_date).toBeInstanceOf(Date);
  });

  it('should update database correctly', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id);

    const input: ProcessPaymentInput = {
      schedule_id: schedule.id,
      amount: 450,
      payment_method: 'online_transfer'
    };

    await processPayment(input);

    // Verify database was updated
    const updatedSchedules = await db.select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, schedule.id))
      .execute();

    const updatedSchedule = updatedSchedules[0];
    expect(parseFloat(updatedSchedule.paid_amount)).toEqual(450);
    expect(updatedSchedule.status).toEqual('PENDING');
  });

  it('should throw error for non-existent payment schedule', async () => {
    const input: ProcessPaymentInput = {
      schedule_id: 999,
      amount: 500,
      payment_method: 'cash'
    };

    expect(processPayment(input)).rejects.toThrow(/payment schedule not found/i);
  });

  it('should throw error for already fully paid schedule', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id);

    // First, make a full payment
    await processPayment({
      schedule_id: schedule.id,
      amount: 900,
      payment_method: 'cash'
    });

    // Try to make another payment
    const input: ProcessPaymentInput = {
      schedule_id: schedule.id,
      amount: 100,
      payment_method: 'cash'
    };

    expect(processPayment(input)).rejects.toThrow(/already fully paid/i);
  });

  it('should handle multiple partial payments correctly', async () => {
    const user = await createTestUser();
    const loan = await createTestLoan(user.id);
    const schedule = await createTestPaymentSchedule(loan.id);

    // First partial payment
    const result1 = await processPayment({
      schedule_id: schedule.id,
      amount: 300,
      payment_method: 'cash'
    });

    expect(result1.paid_amount).toEqual(300);
    expect(result1.status).toEqual('PENDING');

    // Second partial payment
    const result2 = await processPayment({
      schedule_id: schedule.id,
      amount: 400,
      payment_method: 'bank_transfer'
    });

    expect(result2.paid_amount).toEqual(700);
    expect(result2.status).toEqual('PENDING');

    // Final payment
    const finalResult = await processPayment({
      schedule_id: schedule.id,
      amount: 200,
      payment_method: 'online_transfer'
    });

    expect(finalResult.paid_amount).toEqual(900);
    expect(finalResult.status).toEqual('PAID');
    expect(finalResult.paid_date).toBeInstanceOf(Date);
  });
});
