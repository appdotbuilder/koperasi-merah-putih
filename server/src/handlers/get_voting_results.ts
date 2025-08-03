
import { db } from '../db';
import { votingsTable, votesTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

interface VotingResult {
    voting_id: number;
    total_votes: number;
    results: Array<{
        option: string;
        votes: number;
        percentage: number;
    }>;
}

export async function getVotingResults(votingId: number): Promise<VotingResult> {
    try {
        // First, verify the voting exists and get its options
        const voting = await db.select()
            .from(votingsTable)
            .where(eq(votingsTable.id, votingId))
            .execute();

        if (voting.length === 0) {
            throw new Error(`Voting with ID ${votingId} not found`);
        }

        const votingData = voting[0];
        const options = votingData.options as string[];

        // Get vote counts grouped by selected option
        const voteResults = await db.select({
            selected_option: votesTable.selected_option,
            vote_count: sql<string>`count(*)::text`
        })
            .from(votesTable)
            .where(eq(votesTable.voting_id, votingId))
            .groupBy(votesTable.selected_option)
            .execute();

        // Convert vote counts to numbers and create a map
        const voteCounts = new Map<string, number>();
        let totalVotes = 0;

        for (const result of voteResults) {
            const count = parseInt(result.vote_count);
            voteCounts.set(result.selected_option, count);
            totalVotes += count;
        }

        // Build results array with all options (including those with 0 votes)
        const results = options.map(option => {
            const votes = voteCounts.get(option) || 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            
            return {
                option,
                votes,
                percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
            };
        });

        return {
            voting_id: votingId,
            total_votes: totalVotes,
            results
        };
    } catch (error) {
        console.error('Failed to get voting results:', error);
        throw error;
    }
}
