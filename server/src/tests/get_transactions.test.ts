
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type CreateUserInput, type Transaction } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data
const testUser1: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '123456789',
  address: '123 Main St',
  identity_number: 'ID123456',
  role: 'MEMBER'
};

const testUser2: CreateUserInput = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '987654321',
  address: '456 Oak St',
  identity_number: 'ID654321',
  role: 'ADMIN'
};

// Helper function to add delay between insertions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return all transactions when no userId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          ...testUser1,
          member_number: 'MBR001'
        },
        {
          ...testUser2,
          member_number: 'MBR002'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create test transactions with delays to ensure proper ordering
    await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        type: 'SAVINGS_DEPOSIT',
        amount: '100.00',
        description: 'Monthly savings deposit',
        created_by: user1Id
      })
      .execute();

    await sleep(10); // Small delay to ensure different timestamps

    await db.insert(transactionsTable)
      .values({
        user_id: user2Id,
        type: 'LOAN_DISBURSEMENT',
        amount: '5000.00',
        description: 'Loan disbursement',
        created_by: user2Id
      })
      .execute();

    await sleep(10); // Small delay to ensure different timestamps

    await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        type: 'LOAN_PAYMENT',
        amount: '250.50',
        description: 'Loan payment',
        created_by: user1Id
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(3);
    
    // Check that numeric conversion worked
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
    });

    // Check that results are ordered by created_at desc (most recent first)
    const amounts = result.map(t => t.amount);
    expect(amounts).toEqual([250.50, 5000.00, 100.00]);

    // Verify transaction details
    expect(result[0].type).toBe('LOAN_PAYMENT');
    expect(result[0].user_id).toBe(user1Id);
    expect(result[1].type).toBe('LOAN_DISBURSEMENT');
    expect(result[1].user_id).toBe(user2Id);
    expect(result[2].type).toBe('SAVINGS_DEPOSIT');
    expect(result[2].user_id).toBe(user1Id);
  });

  it('should return only user-specific transactions when userId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          ...testUser1,
          member_number: 'MBR001'
        },
        {
          ...testUser2,
          member_number: 'MBR002'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create test transactions for both users with delays
    await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        type: 'SAVINGS_DEPOSIT',
        amount: '100.00',
        description: 'User 1 deposit',
        created_by: user1Id
      })
      .execute();

    await sleep(10);

    await db.insert(transactionsTable)
      .values({
        user_id: user2Id,
        type: 'LOAN_DISBURSEMENT',
        amount: '5000.00',
        description: 'User 2 loan',
        created_by: user2Id
      })
      .execute();

    await sleep(10);

    await db.insert(transactionsTable)
      .values({
        user_id: user1Id,
        type: 'LOAN_PAYMENT',
        amount: '50.00',
        description: 'User 1 payment',
        created_by: user1Id
      })
      .execute();

    // Get transactions for user1 only
    const result = await getTransactions(user1Id);

    expect(result).toHaveLength(2);
    
    // All transactions should belong to user1
    result.forEach(transaction => {
      expect(transaction.user_id).toBe(user1Id);
      expect(typeof transaction.amount).toBe('number');
    });

    // Check specific transactions
    const amounts = result.map(t => t.amount);
    expect(amounts).toEqual([50.00, 100.00]); // Ordered by created_at desc

    expect(result[0].description).toBe('User 1 payment');
    expect(result[1].description).toBe('User 1 deposit');
  });

  it('should return empty array for non-existent user', async () => {
    // Create a user and transaction
    const users = await db.insert(usersTable)
      .values({
        ...testUser1,
        member_number: 'MBR001'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        type: 'SAVINGS_DEPOSIT',
        amount: '100.00',
        description: 'Test transaction',
        created_by: userId
      })
      .execute();

    // Query for non-existent user
    const result = await getTransactions(99999);
    expect(result).toEqual([]);
  });

  it('should handle different transaction types correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        ...testUser1,
        member_number: 'MBR001'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create transactions with different types (single insert to avoid ordering issues)
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          type: 'SAVINGS_DEPOSIT',
          amount: '100.00',
          description: 'Savings deposit',
          created_by: userId
        },
        {
          user_id: userId,
          type: 'LOAN_DISBURSEMENT',
          amount: '2000.00',
          description: 'Loan disbursement',
          created_by: userId
        },
        {
          user_id: userId,
          type: 'SHU_DISTRIBUTION',
          amount: '150.75',
          description: 'SHU distribution',
          created_by: userId
        },
        {
          user_id: userId,
          type: 'ADMINISTRATIVE',
          amount: '25.00',
          description: 'Administrative fee',
          created_by: userId
        }
      ])
      .execute();

    const result = await getTransactions(userId);

    expect(result).toHaveLength(4);
    
    // Verify all transaction types are present
    const types = result.map(t => t.type);
    expect(types).toContain('SAVINGS_DEPOSIT');
    expect(types).toContain('LOAN_DISBURSEMENT');
    expect(types).toContain('SHU_DISTRIBUTION');
    expect(types).toContain('ADMINISTRATIVE');

    // Verify all amounts are properly converted to numbers
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.amount).toBeGreaterThan(0);
    });
  });
});
