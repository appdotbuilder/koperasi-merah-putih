
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, savingsTable } from '../db/schema';
import { type CreateUserInput, type CreateSavingsInput } from '../schema';
import { getUserSavings } from '../handlers/get_user_savings';

// Test user data
const testUser: CreateUserInput = {
  name: 'John Doe',
  email: 'john@test.com',
  phone: '+1234567890',
  address: '123 Main St',
  identity_number: 'ID123456789',
  role: 'MEMBER'
};

// Test savings data
const testSavings1: CreateSavingsInput = {
  user_id: 1,
  type: 'MANDATORY',
  amount: 500.50,
  description: 'Monthly mandatory savings'
};

const testSavings2: CreateSavingsInput = {
  user_id: 1,
  type: 'VOLUNTARY',
  amount: 1000.25,
  description: 'Voluntary savings deposit'
};

const testSavings3: CreateSavingsInput = {
  user_id: 2, // Different user
  type: 'MANDATORY',
  amount: 300.00,
  description: 'Other user savings'
};

describe('getUserSavings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no savings', async () => {
    // Create user but no savings
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    const result = await getUserSavings(1);

    expect(result).toEqual([]);
  });

  it('should return all savings for a specific user', async () => {
    // Create users
    await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address,
          identity_number: testUser.identity_number,
          role: testUser.role
        },
        {
          member_number: 'MEM002',
          name: 'Jane Doe',
          email: 'jane@test.com',
          phone: '+1234567891',
          address: '456 Oak St',
          identity_number: 'ID987654321',
          role: 'MEMBER'
        }
      ])
      .execute();

    // Create savings records
    await db.insert(savingsTable)
      .values([
        {
          user_id: testSavings1.user_id,
          type: testSavings1.type,
          amount: testSavings1.amount.toString(),
          balance: testSavings1.amount.toString(),
          description: testSavings1.description
        },
        {
          user_id: testSavings2.user_id,
          type: testSavings2.type,
          amount: testSavings2.amount.toString(),
          balance: (testSavings1.amount + testSavings2.amount).toString(),
          description: testSavings2.description
        },
        {
          user_id: testSavings3.user_id,
          type: testSavings3.type,
          amount: testSavings3.amount.toString(),
          balance: testSavings3.amount.toString(),
          description: testSavings3.description
        }
      ])
      .execute();

    const result = await getUserSavings(1);

    // Should return only user 1's savings (2 records)
    expect(result).toHaveLength(2);
    
    // Verify numeric conversions
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[0].balance).toBe('number');
    
    // Verify content (should be ordered by transaction_date desc)
    const amounts = result.map(s => s.amount);
    expect(amounts).toContain(500.50);
    expect(amounts).toContain(1000.25);
    
    // Verify user_id filtering
    result.forEach(savings => {
      expect(savings.user_id).toBe(1);
    });

    // Verify required fields
    result.forEach(savings => {
      expect(savings.id).toBeDefined();
      expect(savings.type).toBeDefined();
      expect(savings.transaction_date).toBeInstanceOf(Date);
      expect(savings.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return savings ordered by transaction_date descending', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    // Create savings with specific dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();

    await db.insert(savingsTable)
      .values([
        {
          user_id: 1,
          type: 'MANDATORY',
          amount: '100.00',
          balance: '100.00',
          description: 'Older savings',
          transaction_date: yesterday
        },
        {
          user_id: 1,
          type: 'VOLUNTARY',
          amount: '200.00',
          balance: '300.00',
          description: 'Newer savings',
          transaction_date: today
        }
      ])
      .execute();

    const result = await getUserSavings(1);

    expect(result).toHaveLength(2);
    // First record should be the newer one (desc order)
    expect(result[0].description).toBe('Newer savings');
    expect(result[1].description).toBe('Older savings');
    expect(result[0].transaction_date >= result[1].transaction_date).toBe(true);
  });

  it('should handle user with no matching savings', async () => {
    // Create user and savings for different user
    await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          address: testUser.address,
          identity_number: testUser.identity_number,
          role: testUser.role
        },
        {
          member_number: 'MEM002',
          name: 'Jane Doe',
          email: 'jane@test.com',
          phone: '+1234567891',
          address: '456 Oak St',
          identity_number: 'ID987654321',
          role: 'MEMBER'
        }
      ])
      .execute();

    // Create savings only for user 2
    await db.insert(savingsTable)
      .values({
        user_id: 2,
        type: 'MANDATORY',
        amount: '500.00',
        balance: '500.00',
        description: 'User 2 savings'
      })
      .execute();

    const result = await getUserSavings(1);

    expect(result).toEqual([]);
  });
});
