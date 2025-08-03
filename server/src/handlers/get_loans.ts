
import { db } from '../db';
import { loansTable } from '../db/schema';
import { type Loan } from '../schema';
import { eq } from 'drizzle-orm';

export async function getLoans(userId?: number): Promise<Loan[]> {
  try {
    const results = userId !== undefined
      ? await db.select().from(loansTable).where(eq(loansTable.user_id, userId)).execute()
      : await db.select().from(loansTable).execute();

    // Convert numeric fields back to numbers
    return results.map(loan => ({
      ...loan,
      amount: parseFloat(loan.amount),
      interest_rate: parseFloat(loan.interest_rate),
      monthly_payment: parseFloat(loan.monthly_payment),
      remaining_balance: parseFloat(loan.remaining_balance)
    }));
  } catch (error) {
    console.error('Failed to fetch loans:', error);
    throw error;
  }
}
