
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, votingsTable, votesTable } from '../db/schema';
import { type CastVoteInput } from '../schema';
import { castVote } from '../handlers/cast_vote';
import { eq, and } from 'drizzle-orm';

describe('castVote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testVotingId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID001',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test voting
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const votingResult = await db.insert(votingsTable)
      .values({
        title: 'Test Voting',
        description: 'A test voting session',
        options: JSON.stringify(['Option A', 'Option B', 'Option C']),
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: tomorrow,
        created_by: testUserId
      })
      .returning()
      .execute();
    testVotingId = votingResult[0].id;
  });

  it('should cast a vote successfully', async () => {
    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option A'
    };

    const result = await castVote(input);

    expect(result.voting_id).toEqual(testVotingId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.selected_option).toEqual('Option A');
    expect(result.id).toBeDefined();
    expect(result.voted_at).toBeInstanceOf(Date);
  });

  it('should save vote to database', async () => {
    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option B'
    };

    const result = await castVote(input);

    const votes = await db.select()
      .from(votesTable)
      .where(eq(votesTable.id, result.id))
      .execute();

    expect(votes).toHaveLength(1);
    expect(votes[0].voting_id).toEqual(testVotingId);
    expect(votes[0].user_id).toEqual(testUserId);
    expect(votes[0].selected_option).toEqual('Option B');
    expect(votes[0].voted_at).toBeInstanceOf(Date);
  });

  it('should throw error if voting not found', async () => {
    const input: CastVoteInput = {
      voting_id: 99999,
      user_id: testUserId,
      selected_option: 'Option A'
    };

    expect(castVote(input)).rejects.toThrow(/voting not found/i);
  });

  it('should throw error if voting is not active', async () => {
    // Update voting status to closed
    await db.update(votingsTable)
      .set({ status: 'CLOSED' })
      .where(eq(votingsTable.id, testVotingId))
      .execute();

    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option A'
    };

    expect(castVote(input)).rejects.toThrow(/voting is not active/i);
  });

  it('should throw error if voting period has ended', async () => {
    // Set voting end date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.update(votingsTable)
      .set({ end_date: yesterday })
      .where(eq(votingsTable.id, testVotingId))
      .execute();

    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option A'
    };

    expect(castVote(input)).rejects.toThrow(/not within the allowed time period/i);
  });

  it('should throw error if user has already voted', async () => {
    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option A'
    };

    // Cast first vote
    await castVote(input);

    // Try to cast second vote
    const secondInput: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option B'
    };

    expect(castVote(secondInput)).rejects.toThrow(/already voted/i);
  });

  it('should throw error for invalid option', async () => {
    const input: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Invalid Option'
    };

    expect(castVote(input)).rejects.toThrow(/invalid option selected/i);
  });

  it('should allow different users to vote for same voting', async () => {
    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        member_number: 'M002',
        name: 'Test User 2',
        email: 'test2@example.com',
        phone: '987654321',
        address: 'Test Address 2',
        identity_number: 'ID002',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    const secondUserId = secondUserResult[0].id;

    // First user votes
    const firstInput: CastVoteInput = {
      voting_id: testVotingId,
      user_id: testUserId,
      selected_option: 'Option A'
    };
    await castVote(firstInput);

    // Second user votes
    const secondInput: CastVoteInput = {
      voting_id: testVotingId,
      user_id: secondUserId,
      selected_option: 'Option B'
    };
    const result = await castVote(secondInput);

    expect(result.user_id).toEqual(secondUserId);
    expect(result.selected_option).toEqual('Option B');

    // Verify both votes exist
    const allVotes = await db.select()
      .from(votesTable)
      .where(eq(votesTable.voting_id, testVotingId))
      .execute();

    expect(allVotes).toHaveLength(2);
  });
});
