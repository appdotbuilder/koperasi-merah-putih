
import { db } from '../db';
import { votingsTable } from '../db/schema';
import { type CreateVotingInput, type Voting } from '../schema';

export async function createVoting(input: CreateVotingInput, createdBy: number): Promise<Voting> {
  try {
    // Insert voting record
    const result = await db.insert(votingsTable)
      .values({
        title: input.title,
        description: input.description,
        options: input.options, // jsonb column - no conversion needed
        start_date: input.start_date,
        end_date: input.end_date,
        created_by: createdBy
      })
      .returning()
      .execute();

    const voting = result[0];
    return {
      ...voting,
      options: voting.options as string[] // Cast jsonb back to string array
    };
  } catch (error) {
    console.error('Voting creation failed:', error);
    throw error;
  }
}
