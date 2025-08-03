
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { votingsTable, usersTable } from '../db/schema';
import { getVotings } from '../handlers/get_votings';

describe('getVotings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no votings exist', async () => {
    const result = await getVotings();
    expect(result).toEqual([]);
  });

  it('should return all votings', async () => {
    // Create a user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test Admin',
        email: 'admin@test.com',
        phone: '1234567890',
        address: 'Test Address',
        identity_number: 'ID001',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test votings
    await db.insert(votingsTable)
      .values([
        {
          title: 'Annual Budget Approval',
          description: 'Vote on the annual budget proposal',
          options: JSON.stringify(['Approve', 'Reject', 'Modify']),
          status: 'ACTIVE',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_by: userId
        },
        {
          title: 'Board Member Election',
          description: 'Elect new board members',
          options: JSON.stringify(['Candidate A', 'Candidate B']),
          status: 'CLOSED',
          start_date: new Date('2023-12-01'),
          end_date: new Date('2023-12-31'),
          created_by: userId
        }
      ])
      .execute();

    const result = await getVotings();

    expect(result).toHaveLength(2);
    
    // Check first voting
    const budgetVoting = result.find(v => v.title === 'Annual Budget Approval');
    expect(budgetVoting).toBeDefined();
    expect(budgetVoting!.description).toBe('Vote on the annual budget proposal');
    expect(budgetVoting!.options).toEqual(['Approve', 'Reject', 'Modify']);
    expect(budgetVoting!.status).toBe('ACTIVE');
    expect(budgetVoting!.created_by).toBe(userId);
    expect(budgetVoting!.start_date).toBeInstanceOf(Date);
    expect(budgetVoting!.end_date).toBeInstanceOf(Date);
    expect(budgetVoting!.created_at).toBeInstanceOf(Date);

    // Check second voting
    const electionVoting = result.find(v => v.title === 'Board Member Election');
    expect(electionVoting).toBeDefined();
    expect(electionVoting!.description).toBe('Elect new board members');
    expect(electionVoting!.options).toEqual(['Candidate A', 'Candidate B']);
    expect(electionVoting!.status).toBe('CLOSED');
    expect(electionVoting!.created_by).toBe(userId);
  });

  it('should handle different voting statuses', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'M002',
        name: 'Test User',
        email: 'user@test.com',
        phone: '0987654321',
        address: 'Test Address 2',
        identity_number: 'ID002',
        role: 'MEMBER'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create votings with different statuses
    await db.insert(votingsTable)
      .values([
        {
          title: 'Active Voting',
          description: 'Currently active voting',
          options: JSON.stringify(['Yes', 'No']),
          status: 'ACTIVE',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000), // Tomorrow
          created_by: userId
        },
        {
          title: 'Closed Voting',
          description: 'Already closed voting',
          options: JSON.stringify(['Option 1', 'Option 2']),
          status: 'CLOSED',
          start_date: new Date(Date.now() - 172800000), // 2 days ago
          end_date: new Date(Date.now() - 86400000), // Yesterday
          created_by: userId
        },
        {
          title: 'Cancelled Voting',
          description: 'Cancelled voting session',
          options: JSON.stringify(['Accept', 'Decline']),
          status: 'CANCELLED',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          created_by: userId
        }
      ])
      .execute();

    const result = await getVotings();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(v => v.status);
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('CLOSED');
    expect(statuses).toContain('CANCELLED');
  });
});
