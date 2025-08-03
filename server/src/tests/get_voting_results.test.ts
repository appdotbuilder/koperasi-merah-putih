
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, votingsTable, votesTable } from '../db/schema';
import { getVotingResults } from '../handlers/get_voting_results';

describe('getVotingResults', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return voting results with vote counts and percentages', async () => {
        // Create test user
        const user = await db.insert(usersTable)
            .values({
                member_number: 'M001',
                name: 'Test User',
                email: 'test@example.com',
                phone: '1234567890',
                address: 'Test Address',
                identity_number: 'ID001',
                role: 'MEMBER',
                status: 'ACTIVE'
            })
            .returning()
            .execute();

        const userId = user[0].id;

        // Create second test user
        const user2 = await db.insert(usersTable)
            .values({
                member_number: 'M002',
                name: 'Test User 2',
                email: 'test2@example.com',
                phone: '1234567891',
                address: 'Test Address 2',
                identity_number: 'ID002',
                role: 'MEMBER',
                status: 'ACTIVE'
            })
            .returning()
            .execute();

        const userId2 = user2[0].id;

        // Create voting with options
        const voting = await db.insert(votingsTable)
            .values({
                title: 'Test Voting',
                description: 'A test voting',
                options: ['Option A', 'Option B', 'Option C'],
                status: 'ACTIVE',
                start_date: new Date(),
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                created_by: userId
            })
            .returning()
            .execute();

        const votingId = voting[0].id;

        // Cast votes
        await db.insert(votesTable)
            .values([
                {
                    voting_id: votingId,
                    user_id: userId,
                    selected_option: 'Option A'
                },
                {
                    voting_id: votingId,
                    user_id: userId2,
                    selected_option: 'Option A'
                }
            ])
            .execute();

        const result = await getVotingResults(votingId);

        expect(result.voting_id).toEqual(votingId);
        expect(result.total_votes).toEqual(2);
        expect(result.results).toHaveLength(3);

        // Check Option A results
        const optionA = result.results.find(r => r.option === 'Option A');
        expect(optionA).toBeDefined();
        expect(optionA!.votes).toEqual(2);
        expect(optionA!.percentage).toEqual(100);

        // Check Option B results (no votes)
        const optionB = result.results.find(r => r.option === 'Option B');
        expect(optionB).toBeDefined();
        expect(optionB!.votes).toEqual(0);
        expect(optionB!.percentage).toEqual(0);

        // Check Option C results (no votes)
        const optionC = result.results.find(r => r.option === 'Option C');
        expect(optionC).toBeDefined();
        expect(optionC!.votes).toEqual(0);
        expect(optionC!.percentage).toEqual(0);
    });

    it('should calculate correct percentages for mixed votes', async () => {
        // Create test users
        const users = await db.insert(usersTable)
            .values([
                {
                    member_number: 'M001',
                    name: 'User 1',
                    email: 'user1@example.com',
                    phone: '1234567890',
                    address: 'Address 1',
                    identity_number: 'ID001',
                    role: 'MEMBER',
                    status: 'ACTIVE'
                },
                {
                    member_number: 'M002',
                    name: 'User 2',
                    email: 'user2@example.com',
                    phone: '1234567891',
                    address: 'Address 2',
                    identity_number: 'ID002',
                    role: 'MEMBER',
                    status: 'ACTIVE'
                },
                {
                    member_number: 'M003',
                    name: 'User 3',
                    email: 'user3@example.com',
                    phone: '1234567892',
                    address: 'Address 3',
                    identity_number: 'ID003',
                    role: 'MEMBER',
                    status: 'ACTIVE'
                },
                {
                    member_number: 'M004',
                    name: 'User 4',
                    email: 'user4@example.com',
                    phone: '1234567893',
                    address: 'Address 4',
                    identity_number: 'ID004',
                    role: 'MEMBER',
                    status: 'ACTIVE'
                }
            ])
            .returning()
            .execute();

        // Create voting
        const voting = await db.insert(votingsTable)
            .values({
                title: 'Mixed Voting Test',
                description: 'Testing mixed vote percentages',
                options: ['Yes', 'No'],
                status: 'ACTIVE',
                start_date: new Date(),
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                created_by: users[0].id
            })
            .returning()
            .execute();

        const votingId = voting[0].id;

        // Cast votes: 3 Yes, 1 No
        await db.insert(votesTable)
            .values([
                { voting_id: votingId, user_id: users[0].id, selected_option: 'Yes' },
                { voting_id: votingId, user_id: users[1].id, selected_option: 'Yes' },
                { voting_id: votingId, user_id: users[2].id, selected_option: 'Yes' },
                { voting_id: votingId, user_id: users[3].id, selected_option: 'No' }
            ])
            .execute();

        const result = await getVotingResults(votingId);

        expect(result.total_votes).toEqual(4);

        const yesResult = result.results.find(r => r.option === 'Yes');
        expect(yesResult!.votes).toEqual(3);
        expect(yesResult!.percentage).toEqual(75);

        const noResult = result.results.find(r => r.option === 'No');
        expect(noResult!.votes).toEqual(1);
        expect(noResult!.percentage).toEqual(25);
    });

    it('should return empty results for voting with no votes', async () => {
        // Create test user
        const user = await db.insert(usersTable)
            .values({
                member_number: 'M001',
                name: 'Test User',
                email: 'test@example.com',
                phone: '1234567890',
                address: 'Test Address',
                identity_number: 'ID001',
                role: 'MEMBER',
                status: 'ACTIVE'
            })
            .returning()
            .execute();

        // Create voting without any votes
        const voting = await db.insert(votingsTable)
            .values({
                title: 'Empty Voting',
                description: 'A voting with no votes',
                options: ['Option 1', 'Option 2'],
                status: 'ACTIVE',
                start_date: new Date(),
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                created_by: user[0].id
            })
            .returning()
            .execute();

        const result = await getVotingResults(voting[0].id);

        expect(result.voting_id).toEqual(voting[0].id);
        expect(result.total_votes).toEqual(0);
        expect(result.results).toHaveLength(2);
        
        result.results.forEach(option => {
            expect(option.votes).toEqual(0);
            expect(option.percentage).toEqual(0);
        });
    });

    it('should throw error for non-existent voting', async () => {
        await expect(getVotingResults(999)).rejects.toThrow(/Voting with ID 999 not found/i);
    });
});
