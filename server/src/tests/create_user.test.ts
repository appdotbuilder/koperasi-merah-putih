
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '081234567890',
  address: 'Jl. Merdeka No. 123, Jakarta',
  identity_number: '3173012345678901',
  role: 'MEMBER'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with correct data', async () => {
    const result = await createUser(testInput);

    // Validate returned user object
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual(testInput.email);
    expect(result.phone).toEqual(testInput.phone);
    expect(result.address).toEqual(testInput.address);
    expect(result.identity_number).toEqual(testInput.identity_number);
    expect(result.role).toEqual('MEMBER');
    expect(result.status).toEqual('PENDING_VERIFICATION');
    expect(result.id).toBeDefined();
    expect(result.member_number).toMatch(/^KMP\d+$/);
    expect(result.date_joined).toBeInstanceOf(Date);
    expect(result.verified_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.name).toEqual('John Doe');
    expect(savedUser.email).toEqual(testInput.email);
    expect(savedUser.phone).toEqual(testInput.phone);
    expect(savedUser.address).toEqual(testInput.address);
    expect(savedUser.identity_number).toEqual(testInput.identity_number);
    expect(savedUser.role).toEqual('MEMBER');
    expect(savedUser.status).toEqual('PENDING_VERIFICATION');
    expect(savedUser.member_number).toMatch(/^KMP\d+$/);
    expect(savedUser.date_joined).toBeInstanceOf(Date);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should create admin user when role is specified', async () => {
    const adminInput: CreateUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'ADMIN'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.status).toEqual('PENDING_VERIFICATION');
  });

  it('should generate unique member numbers', async () => {
    const user1Input: CreateUserInput = {
      ...testInput,
      email: 'user1@example.com',
      identity_number: '3173012345678901'
    };

    const user2Input: CreateUserInput = {
      ...testInput,
      email: 'user2@example.com',
      identity_number: '3173012345678902'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.member_number).not.toEqual(user2.member_number);
    expect(user1.member_number).toMatch(/^KMP\d+$/);
    expect(user2.member_number).toMatch(/^KMP\d+$/);
  });

  it('should handle duplicate email constraint', async () => {
    await createUser(testInput);

    const duplicateInput: CreateUserInput = {
      ...testInput,
      identity_number: '3173012345678902'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle duplicate identity_number constraint', async () => {
    await createUser(testInput);

    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });
});
