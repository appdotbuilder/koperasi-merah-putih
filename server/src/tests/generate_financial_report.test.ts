
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, savingsTable, loansTable, paymentSchedulesTable, transactionsTable } from '../db/schema';
import { generateFinancialReport } from '../handlers/generate_financial_report';

describe('generateFinancialReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty financial report for period with no data', async () => {
    const result = await generateFinancialReport(2024, 1);

    expect(result.period).toBe('2024-01');
    expect(result.balance_sheet.assets.cash).toBe(0);
    expect(result.balance_sheet.assets.loans_receivable).toBe(0);
    expect(result.balance_sheet.assets.total_assets).toBe(0);
    expect(result.balance_sheet.liabilities.member_savings).toBe(0);
    expect(result.balance_sheet.liabilities.total_liabilities).toBe(0);
    expect(result.balance_sheet.equity.total_equity).toBe(0);
    expect(result.income_statement.revenues.interest_income).toBe(0);
    expect(result.income_statement.revenues.total_revenue).toBe(0);
    expect(result.income_statement.expenses.operational_expenses).toBe(0);
    expect(result.income_statement.expenses.total_expenses).toBe(0);
    expect(result.income_statement.net_income).toBe(0);
  });

  it('should generate yearly financial report', async () => {
    const result = await generateFinancialReport(2024);

    expect(result.period).toBe('2024');
    expect(typeof result.balance_sheet.assets.total_assets).toBe('number');
    expect(typeof result.income_statement.net_income).toBe('number');
  });

  it('should calculate financial report with member savings and loans', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create savings record
    await db.insert(savingsTable)
      .values({
        user_id: userId,
        type: 'MANDATORY',
        amount: '1000.00',
        balance: '1000.00',
        description: 'Test savings'
      })
      .execute();

    // Create active loan
    await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '5000.00',
        interest_rate: '12.00',
        term_months: 12,
        monthly_payment: '444.24',
        remaining_balance: '4500.00',
        status: 'ACTIVE'
      })
      .execute();

    const result = await generateFinancialReport(2024);

    expect(result.balance_sheet.assets.loans_receivable).toBe(4500);
    expect(result.balance_sheet.liabilities.member_savings).toBe(1000);
    expect(result.balance_sheet.assets.total_assets).toBeGreaterThan(0);
    expect(result.balance_sheet.equity.total_equity).toBe(
      result.balance_sheet.assets.total_assets - result.balance_sheet.liabilities.total_liabilities
    );
  });

  it('should calculate interest income from payments in period', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const adminResult = await db.insert(usersTable)
      .values({
        member_number: 'A001',
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '987654321',
        address: 'Admin Address',
        identity_number: 'ID002',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create loan
    const loanResult = await db.insert(loansTable)
      .values({
        user_id: userId,
        amount: '5000.00',
        interest_rate: '12.00',
        term_months: 12,
        monthly_payment: '444.24',
        remaining_balance: '4500.00',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const loanId = loanResult[0].id;

    // Create payment schedule with paid payment in January 2024
    await db.insert(paymentSchedulesTable)
      .values({
        loan_id: loanId,
        installment_number: 1,
        due_date: new Date('2024-01-15'),
        principal_amount: '394.24',
        interest_amount: '50.00',
        total_amount: '444.24',
        paid_amount: '444.24',
        paid_date: new Date('2024-01-15'),
        status: 'PAID',
        late_fee: '0.00'
      })
      .execute();

    // Create loan payment transaction
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'LOAN_PAYMENT',
        amount: '444.24',
        description: 'Loan payment',
        created_by: adminId,
        created_at: new Date('2024-01-15')
      })
      .execute();

    const result = await generateFinancialReport(2024, 1);

    expect(result.income_statement.revenues.interest_income).toBe(50);
    expect(result.income_statement.revenues.total_revenue).toBe(50);
    expect(result.income_statement.net_income).toBe(50);
  });

  it('should calculate operational expenses from administrative transactions', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        member_number: 'A001',
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '987654321',
        address: 'Admin Address',
        identity_number: 'ID002',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create administrative transaction in January 2024
    await db.insert(transactionsTable)
      .values({
        user_id: adminId,
        type: 'ADMINISTRATIVE',
        amount: '200.00',
        description: 'Office rent',
        created_by: adminId,
        created_at: new Date('2024-01-10')
      })
      .execute();

    const result = await generateFinancialReport(2024, 1);

    expect(result.income_statement.expenses.operational_expenses).toBe(200);
    expect(result.income_statement.expenses.total_expenses).toBe(200);
    expect(result.income_statement.net_income).toBe(-200);
  });

  it('should filter transactions by monthly period correctly', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        member_number: 'A001',
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '987654321',
        address: 'Admin Address',
        identity_number: 'ID002',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create transaction in January 2024
    await db.insert(transactionsTable)
      .values({
        user_id: adminId,
        type: 'ADMINISTRATIVE',
        amount: '100.00',
        description: 'January expense',
        created_by: adminId,
        created_at: new Date('2024-01-15')
      })
      .execute();

    // Create transaction in February 2024 (should not be included)
    await db.insert(transactionsTable)
      .values({
        user_id: adminId,
        type: 'ADMINISTRATIVE',
        amount: '150.00',
        description: 'February expense',
        created_by: adminId,
        created_at: new Date('2024-02-10')
      })
      .execute();

    const januaryResult = await generateFinancialReport(2024, 1);
    const februaryResult = await generateFinancialReport(2024, 2);

    expect(januaryResult.income_statement.expenses.operational_expenses).toBe(100);
    expect(februaryResult.income_statement.expenses.operational_expenses).toBe(150);
  });
});
