
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, loansTable, paymentSchedulesTable } from '../db/schema';
import { type ApproveLoanInput } from '../schema';
import { approveLoan } from '../handlers/approve_loan';
import { eq } from 'drizzle-orm';

describe('approveLoan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let adminId: number;
  let loanId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID123456',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '987654321',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    adminId = adminResult[0].id;

    // Create test loan
    const loanResult = await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '10000.00',
        interest_rate: '0.00', // Will be set during approval
        term_months: 12,
        monthly_payment: '0.00', // Will be calculated during approval
        remaining_balance: '0.00', // Will be set during approval
        status: 'PENDING'
      })
      .returning()
      .execute();
    loanId = loanResult[0].id;
  });

  it('should approve a loan with default interest rate', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true
    };

    const result = await approveLoan(input, adminId);

    expect(result.id).toEqual(loanId);
    expect(result.status).toEqual('APPROVED');
    expect(result.interest_rate).toEqual(12.0);
    expect(result.monthly_payment).toBeGreaterThan(0);
    expect(result.remaining_balance).toEqual(10000);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.approved_by).toEqual(adminId);
  });

  it('should approve a loan with custom interest rate', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true,
      interest_rate: 15.0
    };

    const result = await approveLoan(input, adminId);

    expect(result.status).toEqual('APPROVED');
    expect(result.interest_rate).toEqual(15.0);
    expect(result.monthly_payment).toBeGreaterThan(0);
    expect(result.remaining_balance).toEqual(10000);
  });

  it('should reject a loan', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: false
    };

    const result = await approveLoan(input, adminId);

    expect(result.id).toEqual(loanId);
    expect(result.status).toEqual('REJECTED');
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.approved_by).toEqual(adminId);
  });

  it('should generate payment schedules when approving loan', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true,
      interest_rate: 12.0
    };

    await approveLoan(input, adminId);

    const schedules = await db.select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.loan_id, loanId))
      .execute();

    expect(schedules).toHaveLength(12);
    
    // Check first payment schedule
    expect(schedules[0].installment_number).toEqual(1);
    expect(parseFloat(schedules[0].principal_amount)).toBeGreaterThan(0);
    expect(parseFloat(schedules[0].interest_amount)).toBeGreaterThan(0);
    expect(parseFloat(schedules[0].total_amount)).toBeGreaterThan(0);
    expect(schedules[0].status).toEqual('PENDING');
    expect(schedules[0].due_date).toBeInstanceOf(Date);

    // Check last payment schedule
    const lastSchedule = schedules[schedules.length - 1];
    expect(lastSchedule.installment_number).toEqual(12);
    expect(parseFloat(lastSchedule.total_amount)).toBeGreaterThan(0);
  });

  it('should not generate payment schedules when rejecting loan', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: false
    };

    await approveLoan(input, adminId);

    const schedules = await db.select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.loan_id, loanId))
      .execute();

    expect(schedules).toHaveLength(0);
  });

  it('should throw error for non-existent loan', async () => {
    const input: ApproveLoanInput = {
      loan_id: 99999,
      approved: true
    };

    expect(approveLoan(input, adminId)).rejects.toThrow(/loan not found/i);
  });

  it('should throw error for non-pending loan', async () => {
    // Update loan to approved status first
    await db.update(loansTable)
      .set({ status: 'APPROVED' })
      .where(eq(loansTable.id, loanId))
      .execute();

    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true
    };

    expect(approveLoan(input, adminId)).rejects.toThrow(/not pending approval/i);
  });

  it('should calculate correct monthly payment amount', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true,
      interest_rate: 12.0
    };

    const result = await approveLoan(input, adminId);

    // For $10,000 at 12% APR over 12 months
    // Expected monthly payment should be approximately $888.49
    expect(result.monthly_payment).toBeCloseTo(888.49, 2);
  });

  it('should update loan in database', async () => {
    const input: ApproveLoanInput = {
      loan_id: loanId,
      approved: true,
      interest_rate: 10.0
    };

    await approveLoan(input, adminId);

    const loans = await db.select()
      .from(loansTable)
      .where(eq(loansTable.id, loanId))
      .execute();

    expect(loans).toHaveLength(1);
    expect(loans[0].status).toEqual('APPROVED');
    expect(parseFloat(loans[0].interest_rate)).toEqual(10.0);
    expect(parseFloat(loans[0].monthly_payment)).toBeGreaterThan(0);
    expect(parseFloat(loans[0].remaining_balance)).toEqual(10000);
    expect(loans[0].approved_by).toEqual(adminId);
    expect(loans[0].approved_at).toBeInstanceOf(Date);
  });
});
