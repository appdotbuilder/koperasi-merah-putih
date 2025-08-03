
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { verifyUser } from '../handlers/verify_user';
import { eq } from 'drizzle-orm';

describe('verifyUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should verify a user and set them to ACTIVE status', async () => {
    // Create a test user with PENDING_VERIFICATION status
    const testUser = await db.insert(usersTable)
      .values({
        member_number: 'M001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: '123 Test St',
        identity_number: 'ID123456',
        role: 'MEMBER',
        status: 'PENDING_VERIFICATION'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Verify the user
    const result = await verifyUser(userId);

    // Check the returned user object
    expect(result.id).toEqual(userId);
    expect(result.status).toEqual('ACTIVE');
    expect(result.verified_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.name).toEqual('Test User');
    expect(result.email).toEqual('test@example.com');
  });

  it('should update the user record in the database', async () => {
    // Create a test user
    const testUser = await db.insert(usersTable)
      .values({
        member_number: 'M002',
        name: 'Another User',
        email: 'another@example.com',
        phone: '0987654321',
        address: '456 Another St',
        identity_number: 'ID789012',
        role: 'MEMBER',
        status: 'PENDING_VERIFICATION'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const originalVerifiedAt = testUser[0].verified_at;

    // Verify user
    await verifyUser(userId);

    // Query the database to confirm changes
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    const updatedUser = updatedUsers[0];
    
    expect(updatedUser.status).toEqual('ACTIVE');
    expect(updatedUser.verified_at).toBeInstanceOf(Date);
    expect(updatedUser.verified_at).not.toEqual(originalVerifiedAt);
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(verifyUser(nonExistentUserId))
      .rejects
      .toThrow(/User with ID 99999 not found/i);
  });

  it('should verify user regardless of current status', async () => {
    // Create a user with INACTIVE status
    const testUser = await db.insert(usersTable)
      .values({
        member_number: 'M003',
        name: 'Inactive User',
        email: 'inactive@example.com',
        phone: '5555555555',
        address: '789 Inactive Ave',
        identity_number: 'ID345678',
        role: 'MEMBER',
        status: 'INACTIVE'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Verify the user (should work even if not PENDING_VERIFICATION)
    const result = await verifyUser(userId);

    expect(result.status).toEqual('ACTIVE');
    expect(result.verified_at).toBeInstanceOf(Date);
  });

  it('should preserve all other user fields during verification', async () => {
    // Create a test user with admin role
    const testUser = await db.insert(usersTable)
      .values({
        member_number: 'M004',
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1111111111',
        address: '999 Admin Blvd',
        identity_number: 'ID999999',
        role: 'ADMIN',
        status: 'PENDING_VERIFICATION'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Verify the user
    const result = await verifyUser(userId);

    // Ensure all original fields are preserved
    expect(result.member_number).toEqual('M004');
    expect(result.name).toEqual('Admin User');
    expect(result.email).toEqual('admin@example.com');
    expect(result.phone).toEqual('1111111111');
    expect(result.address).toEqual('999 Admin Blvd');
    expect(result.identity_number).toEqual('ID999999');
    expect(result.role).toEqual('ADMIN');
    expect(result.date_joined).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // But status and verification fields should be updated
    expect(result.status).toEqual('ACTIVE');
    expect(result.verified_at).toBeInstanceOf(Date);
  });
});
