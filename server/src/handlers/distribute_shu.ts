
import { db } from '../db';
import { 
  shuCalculationsTable, 
  shuDistributionsTable, 
  usersTable, 
  savingsTable, 
  loansTable 
} from '../db/schema';
import { type SHUDistribution } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

export async function distributeSHU(shuCalculationId: number): Promise<SHUDistribution[]> {
  try {
    // First, verify that the SHU calculation exists and hasn't been distributed yet
    const shuCalculation = await db.select()
      .from(shuCalculationsTable)
      .where(eq(shuCalculationsTable.id, shuCalculationId))
      .execute();

    if (shuCalculation.length === 0) {
      throw new Error('SHU calculation not found');
    }

    if (shuCalculation[0].distributed) {
      throw new Error('SHU has already been distributed');
    }

    const calculation = shuCalculation[0];
    const totalMemberShare = parseFloat(calculation.total_member_share);

    // Get all active members
    const activeMembers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.status, 'ACTIVE'))
      .execute();

    if (activeMembers.length === 0) {
      throw new Error('No active members found for distribution');
    }

    // Calculate total savings contributions for all active members
    const savingsContributions = await db.select({
      user_id: savingsTable.user_id,
      total_savings: sum(savingsTable.amount)
    })
    .from(savingsTable)
    .innerJoin(usersTable, eq(savingsTable.user_id, usersTable.id))
    .where(eq(usersTable.status, 'ACTIVE'))
    .groupBy(savingsTable.user_id)
    .execute();

    // Calculate total loan contributions for all active members
    const loanContributions = await db.select({
      user_id: loansTable.user_id,
      total_loans: sum(loansTable.amount)
    })
    .from(loansTable)
    .innerJoin(usersTable, eq(loansTable.user_id, usersTable.id))
    .where(and(
      eq(usersTable.status, 'ACTIVE'),
      eq(loansTable.status, 'COMPLETED')
    ))
    .groupBy(loansTable.user_id)
    .execute();

    // Convert to maps for easier lookup - handle null values from sum()
    const savingsMap = new Map(
      savingsContributions.map(s => [
        s.user_id, 
        s.total_savings ? parseFloat(s.total_savings) : 0
      ])
    );

    const loansMap = new Map(
      loanContributions.map(l => [
        l.user_id, 
        l.total_loans ? parseFloat(l.total_loans) : 0
      ])
    );

    // Calculate total contributions across all members
    const totalSavingsContribution = Array.from(savingsMap.values()).reduce((sum, val) => sum + val, 0);
    const totalLoanContribution = Array.from(loansMap.values()).reduce((sum, val) => sum + val, 0);
    const totalContribution = totalSavingsContribution + totalLoanContribution;

    // Create distribution records for each active member
    const distributions: SHUDistribution[] = [];
    
    for (const member of activeMembers) {
      const savingsContribution = savingsMap.get(member.id) || 0;
      const loanContribution = loansMap.get(member.id) || 0;
      const memberTotalContribution = savingsContribution + loanContribution;
      
      // Calculate member's share based on their contribution ratio
      // If no total contributions, distribute equally among all active members
      const shareAmount = totalContribution > 0 
        ? totalMemberShare * (memberTotalContribution / totalContribution)
        : totalMemberShare / activeMembers.length;

      // Insert distribution record
      const distributionResult = await db.insert(shuDistributionsTable)
        .values({
          shu_calculation_id: shuCalculationId,
          user_id: member.id,
          savings_contribution: savingsContribution.toString(),
          loan_contribution: loanContribution.toString(),
          share_amount: shareAmount.toString(),
          distributed_at: new Date()
        })
        .returning()
        .execute();

      const distribution = distributionResult[0];
      distributions.push({
        ...distribution,
        savings_contribution: parseFloat(distribution.savings_contribution),
        loan_contribution: parseFloat(distribution.loan_contribution),
        share_amount: parseFloat(distribution.share_amount)
      });
    }

    // Mark the SHU calculation as distributed
    await db.update(shuCalculationsTable)
      .set({ distributed: true })
      .where(eq(shuCalculationsTable.id, shuCalculationId))
      .execute();

    return distributions;
  } catch (error) {
    console.error('SHU distribution failed:', error);
    throw error;
  }
}
