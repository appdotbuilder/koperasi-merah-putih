
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getTransactions(userId?: number): Promise<Transaction[]> {
  try {
    // Build the base query with proper type handling
    const baseQuery = db.select().from(transactionsTable);
    
    // Apply conditional filtering and ordering in one go
    const query = userId !== undefined 
      ? baseQuery.where(eq(transactionsTable.user_id, userId)).orderBy(desc(transactionsTable.created_at))
      : baseQuery.orderBy(desc(transactionsTable.created_at));
    
    const results = await query.execute();
    
    // Convert numeric fields to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}
