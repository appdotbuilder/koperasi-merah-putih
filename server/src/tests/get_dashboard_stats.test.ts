
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  savingsTable, 
  loansTable, 
  paymentSchedulesTable,
  shuDistributionsTable,
  shuCalculationsTable,
  transactionsTable 
} from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_members).toEqual(0);
    expect(stats.active_members).toEqual(0);
    expect(stats.total_savings).toEqual(0);
    expect(stats.total_loans).toEqual(0);
    expect(stats.active_loans).toEqual(0);
    expect(stats.overdue_payments).toEqual(0);
    expect(stats.pending_loan_applications).toEqual(0);
    expect(stats.total_shu_distributed).toEqual(0);
    expect(stats.cash_balance).toEqual(0);
  });

  it('should calculate member statistics correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'M001',
          name: 'Active User',
          email: 'active@test.com',
          phone: '123456789',
          address: 'Test Address',
          identity_number: 'ID001',
          status: 'ACTIVE'
        },
        {
          member_number: 'M002',
          name: 'Inactive User',
          email: 'inactive@test.com',
          phone: '123456790',
          address: 'Test Address 2',
          identity_number: 'ID002',
          status: 'INACTIVE'
        },
        {
          member_number: 'M003',
          name: 'Pending User',
          email: 'pending@test.com',
          phone: '123456791',
          address: 'Test Address 3',
          identity_number: 'ID003',
          status: 'PENDING_VERIFICATION'
        }
      ])
      .returning()
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_members).toEqual(3);
    expect(stats.active_members).toEqual(1);
  });

  it('should calculate savings statistics correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    // Create savings records
    await db.insert(savingsTable)
      .values([
        {
          user_id: user[0].id,
          type: 'MANDATORY',
          amount: '100.00',
          balance: '100.00',
          description: 'Monthly savings'
        },
        {
          user_id: user[0].id,
          type: 'VOLUNTARY',
          amount: '50.00',
          balance: '150.00',
          description: 'Additional savings'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_savings).toEqual(250); // 100 + 150
  });

  it('should calculate loan statistics correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    // Create loan records
    await db.insert(loansTable)
      .values([
        {
          user_id: user[0].id,
          amount: '1000.00',
          interest_rate: '12.00',
          term_months: 12,
          monthly_payment: '88.85',
          remaining_balance: '1000.00',
          status: 'ACTIVE'
        },
        {
          user_id: user[0].id,
          amount: '500.00',
          interest_rate: '10.00',
          term_months: 6,
          monthly_payment: '86.07',
          remaining_balance: '500.00',
          status: 'PENDING'
        },
        {
          user_id: user[0].id,
          amount: '2000.00',
          interest_rate: '15.00',
          term_months: 24,
          monthly_payment: '96.51',
          remaining_balance: '0.00',
          status: 'COMPLETED'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_loans).toEqual(3500); // 1000 + 500 + 2000
    expect(stats.active_loans).toEqual(1);
    expect(stats.pending_loan_applications).toEqual(1);
  });

  it('should calculate overdue payments correctly', async () => {
    // Create test user and loan
    const user = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    const loan = await db.insert(loansTable)
      .values({
        user_id: user[0].id,
        amount: '1000.00',
        interest_rate: '12.00',
        term_months: 12,
        monthly_payment: '88.85',
        remaining_balance: '1000.00',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create payment schedules - one overdue, one current
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // 10 days from now

    await db.insert(paymentSchedulesTable)
      .values([
        {
          loan_id: loan[0].id,
          installment_number: 1,
          due_date: pastDate,
          principal_amount: '80.00',
          interest_amount: '8.85',
          total_amount: '88.85',
          paid_amount: '0.00',
          status: 'PENDING'
        },
        {
          loan_id: loan[0].id,
          installment_number: 2,
          due_date: futureDate,
          principal_amount: '80.00',
          interest_amount: '8.85',
          total_amount: '88.85',
          paid_amount: '0.00',
          status: 'PENDING'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.overdue_payments).toEqual(1);
  });

  it('should calculate SHU distribution correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    // Create SHU calculation
    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2023,
        total_profit: '10000.00',
        member_share_percentage: '60.00',
        total_member_share: '6000.00',
        calculated_by: user[0].id
      })
      .returning()
      .execute();

    // Create SHU distribution
    await db.insert(shuDistributionsTable)
      .values({
        shu_calculation_id: shuCalculation[0].id,
        user_id: user[0].id,
        savings_contribution: '1000.00',
        loan_contribution: '500.00',
        share_amount: '150.00'
      })
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_shu_distributed).toEqual(150);
  });

  it('should calculate cash balance correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    // Create transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user[0].id,
          type: 'SAVINGS_DEPOSIT',
          amount: '1000.00',
          description: 'Savings deposit',
          created_by: user[0].id
        },
        {
          user_id: user[0].id,
          type: 'SAVINGS_DEPOSIT',
          amount: '500.00',
          description: 'Another savings deposit',
          created_by: user[0].id
        },
        {
          user_id: user[0].id,
          type: 'LOAN_DISBURSEMENT',
          amount: '800.00',
          description: 'Loan disbursement',
          created_by: user[0].id
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.cash_balance).toEqual(700); // 1500 - 800
  });

  it('should handle comprehensive dashboard data correctly', async () => {
    // Create multiple users
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'M001',
          name: 'Active User 1',
          email: 'active1@test.com',
          phone: '123456789',
          address: 'Test Address 1',
          identity_number: 'ID001',
          status: 'ACTIVE'
        },
        {
          member_number: 'M002',
          name: 'Active User 2',
          email: 'active2@test.com',
          phone: '123456790',
          address: 'Test Address 2',
          identity_number: 'ID002',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    // Create savings
    await db.insert(savingsTable)
      .values([
        {
          user_id: users[0].id,
          type: 'MANDATORY',
          amount: '200.00',
          balance: '200.00',
          description: 'Monthly savings'
        },
        {
          user_id: users[1].id,
          type: 'VOLUNTARY',
          amount: '300.00',
          balance: '300.00',
          description: 'Voluntary savings'
        }
      ])
      .execute();

    // Create loans with different statuses
    await db.insert(loansTable)
      .values([
        {
          user_id: users[0].id,
          amount: '1500.00',
          interest_rate: '12.00',
          term_months: 12,
          monthly_payment: '133.28',
          remaining_balance: '1500.00',
          status: 'ACTIVE'
        },
        {
          user_id: users[1].id,
          amount: '800.00',
          interest_rate: '10.00',
          term_months: 6,
          monthly_payment: '138.35',
          remaining_balance: '800.00',
          status: 'PENDING'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_members).toEqual(2);
    expect(stats.active_members).toEqual(2);
    expect(stats.total_savings).toEqual(500); // 200 + 300
    expect(stats.total_loans).toEqual(2300); // 1500 + 800
    expect(stats.active_loans).toEqual(1);
    expect(stats.pending_loan_applications).toEqual(1);
  });
});
