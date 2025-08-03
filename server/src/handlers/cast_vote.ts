
import { db } from '../db';
import { votesTable, votingsTable } from '../db/schema';
import { type CastVoteInput, type Vote } from '../schema';
import { eq, and } from 'drizzle-orm';

export const castVote = async (input: CastVoteInput): Promise<Vote> => {
  try {
    // Check if voting exists and is active
    const voting = await db.select()
      .from(votingsTable)
      .where(eq(votingsTable.id, input.voting_id))
      .execute();

    if (voting.length === 0) {
      throw new Error('Voting not found');
    }

    const votingRecord = voting[0];
    if (votingRecord.status !== 'ACTIVE') {
      throw new Error('Voting is not active');
    }

    // Check if voting is within the allowed time period
    const now = new Date();
    if (now < votingRecord.start_date || now > votingRecord.end_date) {
      throw new Error('Voting is not within the allowed time period');
    }

    // Check if user has already voted
    const existingVote = await db.select()
      .from(votesTable)
      .where(and(
        eq(votesTable.voting_id, input.voting_id),
        eq(votesTable.user_id, input.user_id)
      ))
      .execute();

    if (existingVote.length > 0) {
      throw new Error('User has already voted');
    }

    // Validate selected option
    const validOptions = votingRecord.options as string[];
    if (!validOptions.includes(input.selected_option)) {
      throw new Error('Invalid option selected');
    }

    // Insert the vote
    const result = await db.insert(votesTable)
      .values({
        voting_id: input.voting_id,
        user_id: input.user_id,
        selected_option: input.selected_option
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vote casting failed:', error);
    throw error;
  }
};
