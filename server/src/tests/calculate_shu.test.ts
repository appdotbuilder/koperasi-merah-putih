
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, savingsTable, loansTable, shuCalculationsTable, shuDistributionsTable } from '../db/schema';
import { calculateSHU } from '../handlers/calculate_shu';
import { eq } from 'drizzle-orm';

describe('calculateSHU', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate SHU for a given year', async () => {
    // Create test users
    const adminUser = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const member1 = await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: 'Member One',
        email: 'member1@test.com',
        phone: '1234567891',
        address: 'Member 1 Address',
        identity_number: 'MEM001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const member2 = await db.insert(usersTable)
      .values({
        member_number: 'MEM002',
        name: 'Member Two',
        email: 'member2@test.com',
        phone: '1234567892',
        address: 'Member 2 Address',
        identity_number: 'MEM002',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create savings for 2024
    await db.insert(savingsTable)
      .values({
        user_id: member1[0].id,
        type: 'MANDATORY',
        amount: '1000000',
        balance: '1000000',
        description: 'Monthly savings',
        transaction_date: new Date('2024-06-15')
      })
      .execute();

    await db.insert(savingsTable)
      .values({
        user_id: member2[0].id,
        type: 'VOLUNTARY',
        amount: '500000',
        balance: '500000',
        description: 'Voluntary savings',
        transaction_date: new Date('2024-07-15')
      })
      .execute();

    // Create loans for 2024
    await db.insert(loansTable)
      .values({
        user_id: member1[0].id,
        amount: '5000000',
        interest_rate: '12',
        term_months: 12,
        monthly_payment: '450000',
        remaining_balance: '5000000',
        status: 'APPROVED',
        applied_at: new Date('2024-03-15'),
        approved_at: new Date('2024-03-20'),
        approved_by: adminUser[0].id
      })
      .execute();

    const result = await calculateSHU(2024, 10000000, adminUser[0].id);

    // Verify SHU calculation
    expect(result.year).toBe(2024);
    expect(result.total_profit).toBe(10000000);
    expect(result.member_share_percentage).toBe(40);
    expect(result.total_member_share).toBe(4000000);
    expect(result.calculated_by).toBe(adminUser[0].id);
    expect(result.distributed).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.calculated_at).toBeInstanceOf(Date);
  });

  it('should save SHU calculation to database', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const result = await calculateSHU(2024, 5000000, adminUser[0].id);

    // Verify record exists in database
    const savedCalculation = await db.select()
      .from(shuCalculationsTable)
      .where(eq(shuCalculationsTable.id, result.id))
      .execute();

    expect(savedCalculation).toHaveLength(1);
    expect(savedCalculation[0].year).toBe(2024);
    expect(parseFloat(savedCalculation[0].total_profit)).toBe(5000000);
    expect(parseFloat(savedCalculation[0].member_share_percentage)).toBe(40);
    expect(parseFloat(savedCalculation[0].total_member_share)).toBe(2000000);
    expect(savedCalculation[0].calculated_by).toBe(adminUser[0].id);
  });

  it('should create SHU distributions for active members', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create active member
    const activeMember = await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: 'Active Member',
        email: 'active@test.com',
        phone: '1234567891',
        address: 'Active Address',
        identity_number: 'ACT001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create inactive member (should not get distribution)
    await db.insert(usersTable)
      .values({
        member_number: 'MEM002',
        name: 'Inactive Member',
        email: 'inactive@test.com',
        phone: '1234567892',
        address: 'Inactive Address',
        identity_number: 'INACT001',
        role: 'MEMBER',
        status: 'INACTIVE'
      })
      .returning()
      .execute();

    const result = await calculateSHU(2024, 8000000, adminUser[0].id);

    // Check distributions were created
    const distributions = await db.select()
      .from(shuDistributionsTable)
      .where(eq(shuDistributionsTable.shu_calculation_id, result.id))
      .execute();

    // Should only have distributions for active members (admin + active member)
    expect(distributions.length).toBe(2);
    
    // Verify active member got a distribution
    const activeMemberDistribution = distributions.find(d => d.user_id === activeMember[0].id);
    expect(activeMemberDistribution).toBeDefined();
    expect(activeMemberDistribution!.shu_calculation_id).toBe(result.id);
    expect(parseFloat(activeMemberDistribution!.savings_contribution)).toBe(0);
    expect(parseFloat(activeMemberDistribution!.loan_contribution)).toBe(0);
    expect(parseFloat(activeMemberDistribution!.share_amount)).toBe(0); // No activity = no share
  });

  it('should throw error if SHU calculation already exists for year', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create first calculation
    await calculateSHU(2024, 5000000, adminUser[0].id);

    // Try to create another for same year
    await expect(calculateSHU(2024, 6000000, adminUser[0].id))
      .rejects.toThrow(/already exists/i);
  });

  it('should throw error if calculator user does not exist', async () => {
    await expect(calculateSHU(2024, 5000000, 999))
      .rejects.toThrow(/not found/i);
  });

  it('should calculate proportional shares based on savings and loans', async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        member_number: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Admin Address',
        identity_number: 'ADMIN123',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create member with significant activity
    const activeMember = await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: 'Active Member',
        email: 'active@test.com',
        phone: '1234567891',
        address: 'Active Address',
        identity_number: 'ACT001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Add significant savings for the year
    await db.insert(savingsTable)
      .values({
        user_id: activeMember[0].id,
        type: 'MANDATORY',
        amount: '2000000',
        balance: '2000000',
        description: 'Large savings',
        transaction_date: new Date('2024-06-15')
      })
      .execute();

    // Add loan for the year
    await db.insert(loansTable)
      .values({
        user_id: activeMember[0].id,
        amount: '10000000',
        interest_rate: '12',
        term_months: 24,
        monthly_payment: '500000',
        remaining_balance: '10000000',
        status: 'APPROVED',
        applied_at: new Date('2024-04-15'),
        approved_at: new Date('2024-04-20'),
        approved_by: adminUser[0].id
      })
      .execute();

    const result = await calculateSHU(2024, 20000000, adminUser[0].id);

    // Check that distributions reflect the member's activity
    const distributions = await db.select()
      .from(shuDistributionsTable)
      .where(eq(shuDistributionsTable.shu_calculation_id, result.id))
      .execute();

    const activeMemberDistribution = distributions.find(d => d.user_id === activeMember[0].id);
    expect(activeMemberDistribution).toBeDefined();
    expect(parseFloat(activeMemberDistribution!.savings_contribution)).toBe(2000000);
    expect(parseFloat(activeMemberDistribution!.loan_contribution)).toBe(10000000);
    
    // Should get a significant share since they have all the activity
    const shareAmount = parseFloat(activeMemberDistribution!.share_amount);
    expect(shareAmount).toBeGreaterThan(0);
    expect(shareAmount).toBeLessThanOrEqual(8000000); // Max possible member share
  });
});
