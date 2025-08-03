
import { db } from '../db';
import { shuCalculationsTable, shuDistributionsTable, savingsTable, loansTable, usersTable } from '../db/schema';
import { type SHUCalculation } from '../schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';

export async function calculateSHU(year: number, totalProfit: number, calculatedBy: number): Promise<SHUCalculation> {
  try {
    // Check if SHU calculation already exists for this year
    const existingCalculation = await db.select()
      .from(shuCalculationsTable)
      .where(eq(shuCalculationsTable.year, year))
      .execute();

    if (existingCalculation.length > 0) {
      throw new Error(`SHU calculation for year ${year} already exists`);
    }

    // Verify calculatedBy user exists
    const calculatorUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, calculatedBy))
      .execute();

    if (calculatorUser.length === 0) {
      throw new Error('Calculator user not found');
    }

    // Define date range for the year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year + 1, 0, 1); // January 1st of next year

    // Calculate total savings contributions for the year
    const savingsContributions = await db.select({
      user_id: savingsTable.user_id,
      total_savings: sum(savingsTable.amount)
    })
      .from(savingsTable)
      .where(and(
        gte(savingsTable.transaction_date, startDate),
        lte(savingsTable.transaction_date, endDate)
      ))
      .groupBy(savingsTable.user_id)
      .execute();

    // Calculate total loan amounts for the year
    const loanContributions = await db.select({
      user_id: loansTable.user_id,
      total_loans: sum(loansTable.amount)
    })
      .from(loansTable)
      .where(and(
        gte(loansTable.applied_at, startDate),
        lte(loansTable.applied_at, endDate)
      ))
      .groupBy(loansTable.user_id)
      .execute();

    // Calculate totals for proportional distribution
    const totalSavingsAmount = savingsContributions.reduce(
      (sum, contrib) => sum + parseFloat(contrib.total_savings || '0'), 
      0
    );
    
    const totalLoanAmount = loanContributions.reduce(
      (sum, contrib) => sum + parseFloat(contrib.total_loans || '0'), 
      0
    );

    // Default member share percentage (40%)
    const memberSharePercentage = 40;
    const totalMemberShare = totalProfit * (memberSharePercentage / 100);

    // Create SHU calculation record
    const shuCalculationResult = await db.insert(shuCalculationsTable)
      .values({
        year,
        total_profit: totalProfit.toString(),
        member_share_percentage: memberSharePercentage.toString(),
        total_member_share: totalMemberShare.toString(),
        calculated_by: calculatedBy
      })
      .returning()
      .execute();

    const shuCalculation = shuCalculationResult[0];

    // Get all active users for distribution
    const activeUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.status, 'ACTIVE'))
      .execute();

    // Create individual SHU distributions
    for (const user of activeUsers) {
      const userSavings = savingsContributions.find(s => s.user_id === user.id);
      const userLoans = loanContributions.find(l => l.user_id === user.id);

      const savingsContribution = parseFloat(userSavings?.total_savings || '0');
      const loanContribution = parseFloat(userLoans?.total_loans || '0');

      // Calculate proportional share
      // SHU distribution is typically 50% based on savings, 50% based on loan usage
      const savingsRatio = totalSavingsAmount > 0 ? savingsContribution / totalSavingsAmount : 0;
      const loanRatio = totalLoanAmount > 0 ? loanContribution / totalLoanAmount : 0;
      
      const shareAmount = (totalMemberShare * 0.5 * savingsRatio) + (totalMemberShare * 0.5 * loanRatio);

      await db.insert(shuDistributionsTable)
        .values({
          shu_calculation_id: shuCalculation.id,
          user_id: user.id,
          savings_contribution: savingsContribution.toString(),
          loan_contribution: loanContribution.toString(),
          share_amount: shareAmount.toString()
        })
        .execute();
    }

    // Return the calculation with proper numeric conversions
    return {
      ...shuCalculation,
      total_profit: parseFloat(shuCalculation.total_profit),
      member_share_percentage: parseFloat(shuCalculation.member_share_percentage),
      total_member_share: parseFloat(shuCalculation.total_member_share)
    };
  } catch (error) {
    console.error('SHU calculation failed:', error);
    throw error;
  }
}
