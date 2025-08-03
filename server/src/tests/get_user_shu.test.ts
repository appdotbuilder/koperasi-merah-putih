
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shuCalculationsTable, shuDistributionsTable } from '../db/schema';
import { getUserSHU } from '../handlers/get_user_shu';

describe('getUserSHU', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no SHU distributions', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserSHU(userId);

    expect(result).toEqual([]);
  });

  it('should return SHU distributions for a specific user', async () => {
    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        {
          member_number: 'TEST001',
          name: 'Test User 1',
          email: 'test1@example.com',
          phone: '1234567890',
          address: 'Test Address 1',
          identity_number: 'ID001'
        },
        {
          member_number: 'TEST002',
          name: 'Test User 2',
          email: 'test2@example.com',
          phone: '1234567891',
          address: 'Test Address 2',
          identity_number: 'ID002'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create SHU calculation
    const shuCalculationResult = await db.insert(shuCalculationsTable)
      .values({
        year: 2023,
        total_profit: '1000000.00',
        member_share_percentage: '60.00',
        total_member_share: '600000.00',
        calculated_by: user1Id
      })
      .returning()
      .execute();

    const calculationId = shuCalculationResult[0].id;

    // Create SHU distributions for both users
    await db.insert(shuDistributionsTable)
      .values([
        {
          shu_calculation_id: calculationId,
          user_id: user1Id,
          savings_contribution: '50000.00',
          loan_contribution: '25000.00',
          share_amount: '15000.00',
          distributed_at: new Date()
        },
        {
          shu_calculation_id: calculationId,
          user_id: user1Id,
          savings_contribution: '30000.00',
          loan_contribution: '20000.00',
          share_amount: '10000.00'
        },
        {
          shu_calculation_id: calculationId,
          user_id: user2Id,
          savings_contribution: '40000.00',
          loan_contribution: '15000.00',
          share_amount: '12000.00'
        }
      ])
      .execute();

    const result = await getUserSHU(user1Id);

    expect(result).toHaveLength(2);
    
    // Verify first distribution
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].shu_calculation_id).toEqual(calculationId);
    expect(typeof result[0].savings_contribution).toBe('number');
    expect(result[0].savings_contribution).toEqual(50000);
    expect(typeof result[0].loan_contribution).toBe('number');
    expect(result[0].loan_contribution).toEqual(25000);
    expect(typeof result[0].share_amount).toBe('number');
    expect(result[0].share_amount).toEqual(15000);
    expect(result[0].distributed_at).toBeInstanceOf(Date);

    // Verify second distribution
    expect(result[1].user_id).toEqual(user1Id);
    expect(result[1].savings_contribution).toEqual(30000);
    expect(result[1].loan_contribution).toEqual(20000);
    expect(result[1].share_amount).toEqual(10000);
    expect(result[1].distributed_at).toBeNull();

    // Verify user2 has different distributions
    const user2Result = await getUserSHU(user2Id);
    expect(user2Result).toHaveLength(1);
    expect(user2Result[0].user_id).toEqual(user2Id);
    expect(user2Result[0].share_amount).toEqual(12000);
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: 'Test Address',
        identity_number: 'ID001'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const shuCalculationResult = await db.insert(shuCalculationsTable)
      .values({
        year: 2023,
        total_profit: '1000000.00',
        member_share_percentage: '60.00',
        total_member_share: '600000.00',
        calculated_by: userId
      })
      .returning()
      .execute();

    // Create distribution with decimal values
    await db.insert(shuDistributionsTable)
      .values({
        shu_calculation_id: shuCalculationResult[0].id,
        user_id: userId,
        savings_contribution: '12345.67',
        loan_contribution: '9876.54',
        share_amount: '3456.78'
      })
      .execute();

    const result = await getUserSHU(userId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].savings_contribution).toBe('number');
    expect(result[0].savings_contribution).toEqual(12345.67);
    expect(typeof result[0].loan_contribution).toBe('number');
    expect(result[0].loan_contribution).toEqual(9876.54);
    expect(typeof result[0].share_amount).toBe('number');
    expect(result[0].share_amount).toEqual(3456.78);
  });
});
