
import { db } from '../db';
import { savingsTable, usersTable } from '../db/schema';
import { type CreateSavingsInput, type Savings } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

export const createSavings = async (input: CreateSavingsInput): Promise<Savings> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Calculate new balance by getting current balance for this user and savings type
    const existingSavings = await db.select({
      totalAmount: sum(savingsTable.amount)
    })
      .from(savingsTable)
      .where(
        and(
          eq(savingsTable.user_id, input.user_id),
          eq(savingsTable.type, input.type)
        )
      )
      .execute();

    const currentBalance = existingSavings[0]?.totalAmount ? parseFloat(existingSavings[0].totalAmount) : 0;
    const newBalance = currentBalance + input.amount;

    // Insert savings record
    const result = await db.insert(savingsTable)
      .values({
        user_id: input.user_id,
        type: input.type,
        amount: input.amount.toString(),
        balance: newBalance.toString(),
        description: input.description,
        transaction_date: new Date(),
        created_at: new Date()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const savings = result[0];
    return {
      ...savings,
      amount: parseFloat(savings.amount),
      balance: parseFloat(savings.balance)
    };
  } catch (error) {
    console.error('Savings creation failed:', error);
    throw error;
  }
};
