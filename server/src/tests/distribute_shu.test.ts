
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  savingsTable, 
  loansTable, 
  shuCalculationsTable,
  shuDistributionsTable 
} from '../db/schema';
import { distributeSHU } from '../handlers/distribute_shu';
import { eq } from 'drizzle-orm';

describe('distributeSHU', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should distribute SHU to active members based on contributions', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'M001',
          name: 'Member One',
          email: 'member1@test.com',
          phone: '123456789',
          address: 'Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'M002',
          name: 'Member Two',
          email: 'member2@test.com',
          phone: '123456790',
          address: 'Address 2',
          identity_number: 'ID002',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'A001',
          name: 'Admin User',
          email: 'admin@test.com',
          phone: '123456791',
          address: 'Admin Address',
          identity_number: 'ADMIN001',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    const member1 = users[0];
    const member2 = users[1];
    const admin = users[2];

    // Create savings records
    await db.insert(savingsTable)
      .values([
        {
          user_id: member1.id,
          type: 'MANDATORY',
          amount: '1000000', // 1M
          balance: '1000000',
          description: 'Monthly savings'
        },
        {
          user_id: member2.id,
          type: 'MANDATORY',
          amount: '500000', // 500K
          balance: '500000',
          description: 'Monthly savings'
        }
      ])
      .execute();

    // Create completed loans
    await db.insert(loansTable)
      .values([
        {
          user_id: member1.id,
          amount: '2000000', // 2M
          interest_rate: '12.5',
          term_months: 12,
          monthly_payment: '180000',
          remaining_balance: '0',
          status: 'COMPLETED',
          approved_by: admin.id,
          approved_at: new Date()
        },
        {
          user_id: member2.id,
          amount: '1000000', // 1M
          interest_rate: '12.5',
          term_months: 12,
          monthly_payment: '90000',
          remaining_balance: '0',
          status: 'COMPLETED',
          approved_by: admin.id,
          approved_at: new Date()
        }
      ])
      .execute();

    // Create SHU calculation
    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2024,
        total_profit: '5000000', // 5M total profit
        member_share_percentage: '60', // 60% for members
        total_member_share: '3000000', // 3M for members
        calculated_by: admin.id
      })
      .returning()
      .execute();

    const calculationId = shuCalculation[0].id;

    // Execute distribution
    const distributions = await distributeSHU(calculationId);

    // Verify distributions were created
    expect(distributions).toHaveLength(3); // 2 members + 1 admin

    // Verify total distributed amount equals total member share
    const totalDistributed = distributions.reduce((sum, d) => sum + d.share_amount, 0);
    expect(totalDistributed).toBeCloseTo(3000000, 2);

    // Verify member1 gets larger share due to higher contributions
    const member1Distribution = distributions.find(d => d.user_id === member1.id);
    const member2Distribution = distributions.find(d => d.user_id === member2.id);
    
    expect(member1Distribution).toBeDefined();
    expect(member2Distribution).toBeDefined();
    expect(member1Distribution!.share_amount).toBeGreaterThan(member2Distribution!.share_amount);

    // Verify contributions are recorded correctly
    expect(member1Distribution!.savings_contribution).toBe(1000000);
    expect(member1Distribution!.loan_contribution).toBe(2000000);
    expect(member2Distribution!.savings_contribution).toBe(500000);
    expect(member2Distribution!.loan_contribution).toBe(1000000);

    // Verify distribution dates are set
    distributions.forEach(d => {
      expect(d.distributed_at).toBeInstanceOf(Date);
    });
  });

  it('should mark SHU calculation as distributed', async () => {
    // Create minimal test data
    const admin = await db.insert(usersTable)
      .values({
        member_number: 'A001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '123456789',
        address: 'Admin Address',
        identity_number: 'ADMIN001',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2024,
        total_profit: '1000000',
        member_share_percentage: '60',
        total_member_share: '600000',
        calculated_by: admin[0].id
      })
      .returning()
      .execute();

    const calculationId = shuCalculation[0].id;

    // Execute distribution
    await distributeSHU(calculationId);

    // Verify calculation is marked as distributed
    const updatedCalculation = await db.select()
      .from(shuCalculationsTable)
      .where(eq(shuCalculationsTable.id, calculationId))
      .execute();

    expect(updatedCalculation[0].distributed).toBe(true);
  });

  it('should throw error if SHU calculation not found', async () => {
    await expect(distributeSHU(999)).rejects.toThrow(/SHU calculation not found/i);
  });

  it('should throw error if SHU already distributed', async () => {
    // Create admin user
    const admin = await db.insert(usersTable)
      .values({
        member_number: 'A001',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '123456789',
        address: 'Admin Address',
        identity_number: 'ADMIN001',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();

    // Create already distributed SHU calculation
    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2024,
        total_profit: '1000000',
        member_share_percentage: '60',
        total_member_share: '600000',
        calculated_by: admin[0].id,
        distributed: true
      })
      .returning()
      .execute();

    const calculationId = shuCalculation[0].id;

    await expect(distributeSHU(calculationId)).rejects.toThrow(/SHU has already been distributed/i);
  });

  it('should distribute equally when no contributions exist', async () => {
    // Create users with no savings or loans
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'M001',
          name: 'Member One',
          email: 'member1@test.com',
          phone: '123456789',
          address: 'Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'M002',
          name: 'Member Two',
          email: 'member2@test.com',
          phone: '123456790',
          address: 'Address 2',
          identity_number: 'ID002',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'A001',
          name: 'Admin User',
          email: 'admin@test.com',
          phone: '123456791',
          address: 'Admin Address',
          identity_number: 'ADMIN001',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    const admin = users[2];

    // Create SHU calculation
    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2024,
        total_profit: '3000000',
        member_share_percentage: '50',
        total_member_share: '1500000',
        calculated_by: admin.id
      })
      .returning()
      .execute();

    const calculationId = shuCalculation[0].id;

    // Execute distribution
    const distributions = await distributeSHU(calculationId);

    // Should create distributions for all active members
    expect(distributions).toHaveLength(3);

    // All members should get equal share when no contributions
    const expectedSharePerMember = 1500000 / 3; // 500,000 each
    distributions.forEach(d => {
      expect(d.share_amount).toBeCloseTo(expectedSharePerMember, 2);
      expect(d.savings_contribution).toBe(0);
      expect(d.loan_contribution).toBe(0);
    });

    // Verify total distributed amount equals total member share
    const totalDistributed = distributions.reduce((sum, d) => sum + d.share_amount, 0);
    expect(totalDistributed).toBeCloseTo(1500000, 2);
  });

  it('should handle members with partial contributions', async () => {
    // Create users - one with savings only, one with loans only
    const users = await db.insert(usersTable)
      .values([
        {
          member_number: 'M001',
          name: 'Saver Member',
          email: 'member1@test.com',
          phone: '123456789',
          address: 'Address 1',
          identity_number: 'ID001',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'M002',
          name: 'Borrower Member',
          email: 'member2@test.com',
          phone: '123456790',
          address: 'Address 2',
          identity_number: 'ID002',
          role: 'MEMBER',
          status: 'ACTIVE'
        },
        {
          member_number: 'A001',
          name: 'Admin User',
          email: 'admin@test.com',
          phone: '123456791',
          address: 'Admin Address',
          identity_number: 'ADMIN001',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      ])
      .returning()
      .execute();

    const saverMember = users[0];
    const borrowerMember = users[1];
    const admin = users[2];

    // Create savings only for saver member
    await db.insert(savingsTable)
      .values({
        user_id: saverMember.id,
        type: 'MANDATORY',
        amount: '1000000',
        balance: '1000000',
        description: 'Monthly savings'
      })
      .execute();

    // Create completed loan only for borrower member
    await db.insert(loansTable)
      .values({
        user_id: borrowerMember.id,
        amount: '1000000',
        interest_rate: '12.5',
        term_months: 12,
        monthly_payment: '90000',
        remaining_balance: '0',
        status: 'COMPLETED',
        approved_by: admin.id,
        approved_at: new Date()
      })
      .execute();

    // Create SHU calculation
    const shuCalculation = await db.insert(shuCalculationsTable)
      .values({
        year: 2024,
        total_profit: '4000000',
        member_share_percentage: '50',
        total_member_share: '2000000',
        calculated_by: admin.id
      })
      .returning()
      .execute();

    const calculationId = shuCalculation[0].id;

    // Execute distribution
    const distributions = await distributeSHU(calculationId);

    // Should create distributions for all active members
    expect(distributions).toHaveLength(3);

    // Verify contributions are recorded correctly
    const saverDistribution = distributions.find(d => d.user_id === saverMember.id);
    const borrowerDistribution = distributions.find(d => d.user_id === borrowerMember.id);
    const adminDistribution = distributions.find(d => d.user_id === admin.id);

    expect(saverDistribution!.savings_contribution).toBe(1000000);
    expect(saverDistribution!.loan_contribution).toBe(0);
    expect(borrowerDistribution!.savings_contribution).toBe(0);
    expect(borrowerDistribution!.loan_contribution).toBe(1000000);
    expect(adminDistribution!.savings_contribution).toBe(0);
    expect(adminDistribution!.loan_contribution).toBe(0);

    // Both contributing members should get equal shares
    expect(saverDistribution!.share_amount).toBeCloseTo(borrowerDistribution!.share_amount, 2);
    expect(adminDistribution!.share_amount).toBe(0);
  });
});
