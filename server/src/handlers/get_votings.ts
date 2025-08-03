
import { db } from '../db';
import { votingsTable } from '../db/schema';
import { type Voting } from '../schema';

export async function getVotings(): Promise<Voting[]> {
  try {
    const results = await db.select()
      .from(votingsTable)
      .execute();

    // Convert numeric fields back to numbers and handle jsonb options
    return results.map(voting => ({
      ...voting,
      options: voting.options as string[] // Cast jsonb to string array
    }));
  } catch (error) {
    console.error('Failed to fetch votings:', error);
    throw error;
  }
}
