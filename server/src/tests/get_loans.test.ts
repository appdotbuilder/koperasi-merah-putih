
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, loansTable } from '../db/schema';
import { getLoans } from '../handlers/get_loans';

describe('getLoans', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all loans when no userId is provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: 'Test Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'MEM002',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '0987654321',
          address: 'Test Address 2',
          identity_number: 'ID002',
          role: 'MEMBER',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    // Create test loans
    await db.insert(loansTable)
      .values([
        {
          user_id: users[0].id,
          amount: '10000.00',
          interest_rate: '12.50',
          term_months: 12,
          monthly_payment: '888.49',
          remaining_balance: '10000.00',
          status: 'APPROVED'
        },
        {
          user_id: users[1].id,
          amount: '5000.00',
          interest_rate: '10.00',
          term_months: 6,
          monthly_payment: '855.24',
          remaining_balance: '5000.00',
          status: 'PENDING'
        }
      ])
      .execute();

    const result = await getLoans();

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toBe(users[0].id);
    expect(result[0].amount).toBe(10000.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].interest_rate).toBe(12.50);
    expect(typeof result[0].interest_rate).toBe('number');
    expect(result[0].monthly_payment).toBe(888.49);
    expect(typeof result[0].monthly_payment).toBe('number');
    expect(result[0].remaining_balance).toBe(10000.00);
    expect(typeof result[0].remaining_balance).toBe('number');
    expect(result[0].status).toBe('APPROVED');
    expect(result[0].term_months).toBe(12);
    expect(result[0].id).toBeDefined();
    expect(result[0].applied_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].user_id).toBe(users[1].id);
    expect(result[1].amount).toBe(5000.00);
    expect(result[1].status).toBe('PENDING');
  });

  it('should return loans for specific user when userId is provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: 'Test Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'MEM002',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '0987654321',
          address: 'Test Address 2',
          identity_number: 'ID002',
          role: 'MEMBER',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    // Create loans for both users
    await db.insert(loansTable)
      .values([
        {
          user_id: users[0].id,
          amount: '10000.00',
          interest_rate: '12.50',
          term_months: 12,
          monthly_payment: '888.49',
          remaining_balance: '10000.00',
          status: 'APPROVED'
        },
        {
          user_id: users[0].id,
          amount: '5000.00',
          interest_rate: '10.00',
          term_months: 6,
          monthly_payment: '855.24',
          remaining_balance: '5000.00',
          status: 'ACTIVE'
        },
        {
          user_id: users[1].id,
          amount: '7500.00',
          interest_rate: '11.00',
          term_months: 24,
          monthly_payment: '347.50',
          remaining_balance: '7500.00',
          status: 'PENDING'
        }
      ])
      .execute();

    // Get loans for first user only
    const result = await getLoans(users[0].id);

    expect(result).toHaveLength(2);
    result.forEach(loan => {
      expect(loan.user_id).toBe(users[0].id);
    });

    // Verify numeric conversions
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[0].interest_rate).toBe('number');
    expect(typeof result[0].monthly_payment).toBe('number');
    expect(typeof result[0].remaining_balance).toBe('number');
  });

  it('should return empty array when user has no loans', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: 'Test Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    const result = await getLoans(users[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no loans exist', async () => {
    const result = await getLoans();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
