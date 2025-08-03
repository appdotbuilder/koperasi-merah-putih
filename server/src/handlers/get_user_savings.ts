
import { db } from '../db';
import { savingsTable } from '../db/schema';
import { type Savings } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserSavings(userId: number): Promise<Savings[]> {
  try {
    const results = await db.select()
      .from(savingsTable)
      .where(eq(savingsTable.user_id, userId))
      .orderBy(desc(savingsTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(savings => ({
      ...savings,
      amount: parseFloat(savings.amount),
      balance: parseFloat(savings.balance)
    }));
  } catch (error) {
    console.error('Failed to fetch user savings:', error);
    throw error;
  }
}
