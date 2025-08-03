
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { votingsTable, usersTable } from '../db/schema';
import { type CreateVotingInput } from '../schema';
import { createVoting } from '../handlers/create_voting';
import { eq } from 'drizzle-orm';

// Test user for created_by field
let testUser: { id: number };

// Test input for voting
const testInput: CreateVotingInput = {
  title: 'Board Election 2024',
  description: 'Election for new board members',
  options: ['Candidate A', 'Candidate B', 'Candidate C'],
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-31')
};

describe('createVoting', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'TEST001',
        name: 'Test Admin',
        email: 'admin@test.com',
        phone: '123456789',
        address: 'Test Address',
        identity_number: 'ID123456',
        role: 'ADMIN',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    
    testUser = userResult[0];
  });
  
  afterEach(resetDB);

  it('should create a voting session', async () => {
    const result = await createVoting(testInput, testUser.id);

    // Basic field validation
    expect(result.title).toEqual('Board Election 2024');
    expect(result.description).toEqual('Election for new board members');
    expect(result.options).toEqual(['Candidate A', 'Candidate B', 'Candidate C']);
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-01-31'));
    expect(result.created_by).toEqual(testUser.id);
    expect(result.status).toEqual('ACTIVE');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save voting to database', async () => {
    const result = await createVoting(testInput, testUser.id);

    // Query database to verify storage
    const votings = await db.select()
      .from(votingsTable)
      .where(eq(votingsTable.id, result.id))
      .execute();

    expect(votings).toHaveLength(1);
    const voting = votings[0];
    expect(voting.title).toEqual('Board Election 2024');
    expect(voting.description).toEqual('Election for new board members');
    expect(voting.options).toEqual(['Candidate A', 'Candidate B', 'Candidate C']);
    expect(voting.start_date).toEqual(new Date('2024-01-01'));
    expect(voting.end_date).toEqual(new Date('2024-01-31'));
    expect(voting.created_by).toEqual(testUser.id);
    expect(voting.status).toEqual('ACTIVE');
    expect(voting.created_at).toBeInstanceOf(Date);
  });

  it('should handle voting with different options', async () => {
    const differentInput: CreateVotingInput = {
      title: 'Policy Change Vote',
      description: 'Should we change the loan policy?',
      options: ['Yes', 'No'],
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-15')
    };

    const result = await createVoting(differentInput, testUser.id);

    expect(result.title).toEqual('Policy Change Vote');
    expect(result.options).toEqual(['Yes', 'No']);
    expect(result.options).toHaveLength(2);
    
    // Verify in database
    const votings = await db.select()
      .from(votingsTable)
      .where(eq(votingsTable.id, result.id))
      .execute();

    expect(votings[0].options).toEqual(['Yes', 'No']);
  });

  it('should handle voting with many options', async () => {
    const manyOptionsInput: CreateVotingInput = {
      title: 'Committee Selection',
      description: 'Select committee members',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'],
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-03-31')
    };

    const result = await createVoting(manyOptionsInput, testUser.id);

    expect(result.options).toHaveLength(5);
    expect(result.options).toContain('Option 1');
    expect(result.options).toContain('Option 5');
  });
});
