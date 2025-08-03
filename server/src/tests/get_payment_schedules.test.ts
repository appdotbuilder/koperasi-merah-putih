
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, loansTable, paymentSchedulesTable } from '../db/schema';
import { getPaymentSchedules } from '../handlers/get_payment_schedules';

describe('getPaymentSchedules', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return payment schedules for a loan ordered by installment number', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: 'Test Address',
        identity_number: 'ID123456',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test loan
    const loanResult = await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '10000.00',
        interest_rate: '5.00',
        term_months: 12,
        monthly_payment: '856.07',
        remaining_balance: '10000.00',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const loanId = loanResult[0].id;

    // Create test payment schedules
    const scheduleData = [
      {
        loan_id: loanId,
        installment_number: 2,
        due_date: new Date('2024-02-01'),
        principal_amount: '810.07',
        interest_amount: '46.00',
        total_amount: '856.07',
        paid_amount: '0.00',
        status: 'PENDING' as const,
        late_fee: '0.00'
      },
      {
        loan_id: loanId,
        installment_number: 1,
        due_date: new Date('2024-01-01'),
        principal_amount: '800.00',
        interest_amount: '56.07',
        total_amount: '856.07',
        paid_amount: '856.07',
        status: 'PAID' as const,
        late_fee: '0.00',
        paid_date: new Date('2024-01-01')
      },
      {
        loan_id: loanId,
        installment_number: 3,
        due_date: new Date('2024-03-01'),
        principal_amount: '820.15',
        interest_amount: '35.92',
        total_amount: '856.07',
        paid_amount: '0.00',
        status: 'PENDING' as const,
        late_fee: '25.00'
      }
    ];

    await db.insert(paymentSchedulesTable)
      .values(scheduleData)
      .execute();

    // Test the handler
    const result = await getPaymentSchedules(loanId);

    // Should return all schedules for the loan
    expect(result).toHaveLength(3);

    // Should be ordered by installment number
    expect(result[0].installment_number).toBe(1);
    expect(result[1].installment_number).toBe(2);
    expect(result[2].installment_number).toBe(3);

    // Verify numeric conversions
    expect(typeof result[0].principal_amount).toBe('number');
    expect(typeof result[0].interest_amount).toBe('number');
    expect(typeof result[0].total_amount).toBe('number');
    expect(typeof result[0].paid_amount).toBe('number');
    expect(typeof result[0].late_fee).toBe('number');

    // Verify specific values
    expect(result[0].principal_amount).toBe(800.00);
    expect(result[0].interest_amount).toBe(56.07);
    expect(result[0].total_amount).toBe(856.07);
    expect(result[0].paid_amount).toBe(856.07);
    expect(result[0].status).toBe('PAID');
    expect(result[0].paid_date).toBeInstanceOf(Date);

    expect(result[2].late_fee).toBe(25.00);
    expect(result[2].status).toBe('PENDING');
    expect(result[2].paid_date).toBeNull();
  });

  it('should return empty array for non-existent loan', async () => {
    const result = await getPaymentSchedules(999);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for loan with no payment schedules', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM002',
        name: 'Test User 2',
        email: 'test2@example.com',
        phone: '1234567891',
        address: 'Test Address 2',
        identity_number: 'ID123457',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a loan without payment schedules
    const loanResult = await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '5000.00',
        interest_rate: '5.00',
        term_months: 6,
        monthly_payment: '856.07',
        remaining_balance: '5000.00',
        status: 'PENDING'
      })
      .returning()
      .execute();

    const loanId = loanResult[0].id;

    const result = await getPaymentSchedules(loanId);
    expect(result).toHaveLength(0);
  });

  it('should handle different payment statuses correctly', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM003',
        name: 'Test User 3',
        email: 'test3@example.com',
        phone: '1234567892',
        address: 'Test Address 3',
        identity_number: 'ID123458',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test loan
    const loanResult = await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '3000.00',
        interest_rate: '5.00',
        term_months: 3,
        monthly_payment: '1000.00',
        remaining_balance: '3000.00',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const loanId = loanResult[0].id;

    // Create payment schedules with different statuses
    await db.insert(paymentSchedulesTable)
      .values([
        {
          loan_id: loanId,
          installment_number: 1,
          due_date: new Date('2024-01-01'),
          principal_amount: '1000.00',
          interest_amount: '0.00',
          total_amount: '1000.00',
          paid_amount: '1000.00',
          status: 'PAID',
          late_fee: '0.00',
          paid_date: new Date('2024-01-01')
        },
        {
          loan_id: loanId,
          installment_number: 2,
          due_date: new Date('2023-12-01'),
          principal_amount: '1000.00',
          interest_amount: '0.00',
          total_amount: '1000.00',
          paid_amount: '500.00',
          status: 'LATE',
          late_fee: '50.00'
        },
        {
          loan_id: loanId,
          installment_number: 3,
          due_date: new Date('2023-11-01'),
          principal_amount: '1000.00',
          interest_amount: '0.00',
          total_amount: '1000.00',
          paid_amount: '0.00',
          status: 'MISSED',
          late_fee: '100.00'
        }
      ])
      .execute();

    const result = await getPaymentSchedules(loanId);

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('PAID');
    expect(result[0].paid_amount).toBe(1000.00);
    expect(result[0].late_fee).toBe(0.00);

    expect(result[1].status).toBe('LATE');
    expect(result[1].paid_amount).toBe(500.00);
    expect(result[1].late_fee).toBe(50.00);

    expect(result[2].status).toBe('MISSED');
    expect(result[2].paid_amount).toBe(0.00);
    expect(result[2].late_fee).toBe(100.00);
  });
});
