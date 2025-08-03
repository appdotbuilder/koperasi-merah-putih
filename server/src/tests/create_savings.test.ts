
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, savingsTable } from '../db/schema';
import { type CreateSavingsInput } from '../schema';
import { createSavings } from '../handlers/create_savings';
import { eq, and } from 'drizzle-orm';

describe('createSavings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test user first
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
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
    
    return userResult[0];
  };

  const testInput: CreateSavingsInput = {
    user_id: 1, // Will be updated with actual user ID
    type: 'MANDATORY',
    amount: 100.50,
    description: 'Monthly mandatory savings'
  };

  it('should create a savings record', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createSavings(input);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.type).toEqual('MANDATORY');
    expect(result.amount).toEqual(100.50);
    expect(result.balance).toEqual(100.50); // First deposit, so balance equals amount
    expect(result.description).toEqual('Monthly mandatory savings');
    expect(result.id).toBeDefined();
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.amount).toBe('number');
    expect(typeof result.balance).toBe('number');
  });

  it('should save savings record to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createSavings(input);

    // Query database to verify record was saved
    const savedSavings = await db.select()
      .from(savingsTable)
      .where(eq(savingsTable.id, result.id))
      .execute();

    expect(savedSavings).toHaveLength(1);
    expect(savedSavings[0].user_id).toEqual(user.id);
    expect(savedSavings[0].type).toEqual('MANDATORY');
    expect(parseFloat(savedSavings[0].amount)).toEqual(100.50);
    expect(parseFloat(savedSavings[0].balance)).toEqual(100.50);
    expect(savedSavings[0].description).toEqual('Monthly mandatory savings');
    expect(savedSavings[0].transaction_date).toBeInstanceOf(Date);
    expect(savedSavings[0].created_at).toBeInstanceOf(Date);
  });

  it('should calculate cumulative balance correctly for multiple deposits', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    // First deposit
    const firstResult = await createSavings(input);
    expect(firstResult.balance).toEqual(100.50);

    // Second deposit of same type
    const secondInput = { ...input, amount: 50.25, description: 'Additional savings' };
    const secondResult = await createSavings(secondInput);
    expect(secondResult.balance).toEqual(150.75); // 100.50 + 50.25
    expect(secondResult.amount).toEqual(50.25);
  });

  it('should handle different savings types independently', async () => {
    const user = await createTestUser();
    const mandatoryInput = { ...testInput, user_id: user.id, type: 'MANDATORY' as const };
    const voluntaryInput = { ...testInput, user_id: user.id, type: 'VOLUNTARY' as const, amount: 75.00 };

    // Create mandatory savings
    const mandatoryResult = await createSavings(mandatoryInput);
    expect(mandatoryResult.balance).toEqual(100.50);

    // Create voluntary savings - should start from 0 balance for this type
    const voluntaryResult = await createSavings(voluntaryInput);
    expect(voluntaryResult.balance).toEqual(75.00);
    expect(voluntaryResult.type).toEqual('VOLUNTARY');
  });

  it('should handle null description', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id, description: null };

    const result = await createSavings(input);

    expect(result.description).toBeNull();
    expect(result.amount).toEqual(100.50);
    expect(result.balance).toEqual(100.50);
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...testInput, user_id: 999 }; // Non-existent user ID

    expect(createSavings(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle savings balance calculation with existing records', async () => {
    const user = await createTestUser();
    
    // Manually insert existing savings to test balance calculation
    await db.insert(savingsTable)
      .values({
        user_id: user.id,
        type: 'MANDATORY',
        amount: '25.75',
        balance: '25.75',
        description: 'Previous savings',
        transaction_date: new Date(),
        created_at: new Date()
      })
      .execute();

    const input = { ...testInput, user_id: user.id, amount: 100.00 };
    const result = await createSavings(input);

    expect(result.balance).toEqual(125.75); // 25.75 + 100.00
    expect(result.amount).toEqual(100.00);
  });
});
