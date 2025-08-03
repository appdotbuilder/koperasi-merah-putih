
import { db } from '../db';
import { shuDistributionsTable } from '../db/schema';
import { type SHUDistribution } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserSHU = async (userId: number): Promise<SHUDistribution[]> => {
  try {
    const results = await db.select()
      .from(shuDistributionsTable)
      .where(eq(shuDistributionsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(distribution => ({
      ...distribution,
      savings_contribution: parseFloat(distribution.savings_contribution),
      loan_contribution: parseFloat(distribution.loan_contribution),
      share_amount: parseFloat(distribution.share_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch user SHU distributions:', error);
    throw error;
  }
};
