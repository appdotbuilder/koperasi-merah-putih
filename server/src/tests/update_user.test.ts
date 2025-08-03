
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async () => {
  const testUserData = {
    member_number: 'TEST001',
    name: 'Test User',
    email: 'test@example.com',
    phone: '123456789',
    address: '123 Test Street',
    identity_number: 'ID123456',
    role: 'MEMBER' as const
  };

  const result = await db.insert(usersTable)
    .values(testUserData)
    .returning()
    .execute();

  return result[0];
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user basic information', async () => {
    // Create test user
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Updated User Name',
      email: 'updated@example.com',
      phone: '987654321'
    };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(testUser.id);
    expect(result.name).toEqual('Updated User Name');
    expect(result.email).toEqual('updated@example.com');
    expect(result.phone).toEqual('987654321');
    expect(result.address).toEqual(testUser.address); // Unchanged
    expect(result.identity_number).toEqual(testUser.identity_number); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user status', async () => {
    // Create test user
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      status: 'ACTIVE'
    };

    const result = await updateUser(updateInput);

    // Verify status update
    expect(result.status).toEqual('ACTIVE');
    expect(result.verified_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create test user
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      address: 'New Address 456'
    };

    const result = await updateUser(updateInput);

    // Verify only address was updated
    expect(result.address).toEqual('New Address 456');
    expect(result.name).toEqual(testUser.name); // Unchanged
    expect(result.email).toEqual(testUser.email); // Unchanged
    expect(result.phone).toEqual(testUser.phone); // Unchanged
    expect(result.identity_number).toEqual(testUser.identity_number); // Unchanged
  });

  it('should save updates to database', async () => {
    // Create test user
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Database Test User',
      status: 'SUSPENDED'
    };

    await updateUser(updateInput);

    // Query database to verify changes were saved
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].name).toEqual('Database Test User');
    expect(updatedUser[0].status).toEqual('SUSPENDED');
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUser[0].updated_at > testUser.updated_at).toBe(true);
  });

  it('should not set verified_at if user already verified', async () => {
    // Create test user and mark as verified
    const testUser = await createTestUser();
    const verifiedAt = new Date();
    
    await db.update(usersTable)
      .set({ 
        status: 'ACTIVE',
        verified_at: verifiedAt
      })
      .where(eq(usersTable.id, testUser.id))
      .execute();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      status: 'ACTIVE'
    };

    const result = await updateUser(updateInput);

    // Verify verified_at wasn't changed
    expect(result.verified_at).toEqual(verifiedAt);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle multiple field updates', async () => {
    // Create test user
    const testUser = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Multi Update User',
      email: 'multi@example.com',
      phone: '555-0123',
      address: 'Multi Update Address',
      identity_number: 'MULTI123',
      status: 'INACTIVE'
    };

    const result = await updateUser(updateInput);

    // Verify all fields were updated
    expect(result.name).toEqual('Multi Update User');
    expect(result.email).toEqual('multi@example.com');
    expect(result.phone).toEqual('555-0123');
    expect(result.address).toEqual('Multi Update Address');
    expect(result.identity_number).toEqual('MULTI123');
    expect(result.status).toEqual('INACTIVE');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});
