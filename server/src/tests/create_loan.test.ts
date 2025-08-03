
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { loansTable, usersTable } from '../db/schema';
import { type CreateLoanInput } from '../schema';
import { createLoan } from '../handlers/create_loan';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  member_number: 'MEM001',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  address: '123 Main St',
  identity_number: 'ID123456789',
  role: 'MEMBER' as const
};

// Test loan input
const testLoanInput: CreateLoanInput = {
  user_id: 1, // Will be set after user creation
  amount: 10000,
  term_months: 12,
  purpose: 'Business expansion'
};

describe('createLoan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a loan application', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const loanInput = { ...testLoanInput, user_id: userId };

    const result = await createLoan(loanInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.amount).toEqual(10000);
    expect(result.term_months).toEqual(12);
    expect(result.remaining_balance).toEqual(10000);
    expect(result.status).toEqual('PENDING');
    expect(result.interest_rate).toEqual(12);
    expect(result.id).toBeDefined();
    expect(result.applied_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toBeNull();

    // Verify numeric types
    expect(typeof result.amount).toBe('number');
    expect(typeof result.interest_rate).toBe('number');
    expect(typeof result.monthly_payment).toBe('number');
    expect(typeof result.remaining_balance).toBe('number');
  });

  it('should calculate monthly payment correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const loanInput = { ...testLoanInput, user_id: userId };

    const result = await createLoan(loanInput);

    // Expected monthly payment calculation:
    // P = 10000, r = 0.01 (12%/12), n = 12
    // PMT = 10000 * [0.01(1.01)^12] / [(1.01)^12 - 1]
    // PMT ≈ 888.49
    expect(result.monthly_payment).toBeCloseTo(888.49, 2);
    expect(result.monthly_payment).toBeGreaterThan(0);
  });

  it('should save loan to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const loanInput = { ...testLoanInput, user_id: userId };

    const result = await createLoan(loanInput);

    // Query database to verify loan was saved
    const loans = await db.select()
      .from(loansTable)
      .where(eq(loansTable.id, result.id))
      .execute();

    expect(loans).toHaveLength(1);
    
    const savedLoan = loans[0];
    expect(savedLoan.user_id).toEqual(userId);
    expect(parseFloat(savedLoan.amount)).toEqual(10000);
    expect(savedLoan.term_months).toEqual(12);
    expect(parseFloat(savedLoan.remaining_balance)).toEqual(10000);
    expect(savedLoan.status).toEqual('PENDING');
    expect(parseFloat(savedLoan.interest_rate)).toEqual(12);
    expect(savedLoan.applied_at).toBeInstanceOf(Date);
    expect(savedLoan.created_at).toBeInstanceOf(Date);
    expect(savedLoan.updated_at).toBeInstanceOf(Date);
    expect(savedLoan.approved_at).toBeNull();
    expect(savedLoan.approved_by).toBeNull();
  });

  it('should handle different loan amounts and terms', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test with different loan parameters
    const loanInput = {
      user_id: userId,
      amount: 50000,
      term_months: 24,
      purpose: 'Home improvement'
    };

    const result = await createLoan(loanInput);

    expect(result.amount).toEqual(50000);
    expect(result.term_months).toEqual(24);
    expect(result.remaining_balance).toEqual(50000);
    expect(result.monthly_payment).toBeGreaterThan(0);
    
    // With 24 months, monthly payment should be lower than 12-month term
    expect(result.monthly_payment).toBeLessThan(50000 / 12); // Should be less than simple division
  });

  it('should throw error for non-existent user', async () => {
    const loanInput = {
      ...testLoanInput,
      user_id: 999 // Non-existent user ID
    };

    await expect(createLoan(loanInput)).rejects.toThrow(/User with ID 999 not found/i);
  });

  it('should handle edge case with single month term', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const loanInput = {
      user_id: userId,
      amount: 1200,
      term_months: 1,
      purpose: 'Emergency expense'
    };

    const result = await createLoan(loanInput);

    expect(result.amount).toEqual(1200);
    expect(result.term_months).toEqual(1);
    
    // For 1 month, payment should be close to principal + 1 month interest
    expect(result.monthly_payment).toBeGreaterThan(1200);
    expect(result.monthly_payment).toBeLessThan(1220); // Should include reasonable interest
  });

  it('should set correct default values', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const loanInput = { ...testLoanInput, user_id: userId };

    const result = await createLoan(loanInput);

    // Check default values
    expect(result.status).toEqual('PENDING');
    expect(result.interest_rate).toEqual(12); // Default rate
    expect(result.remaining_balance).toEqual(result.amount);
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toBeNull();
  });
});
