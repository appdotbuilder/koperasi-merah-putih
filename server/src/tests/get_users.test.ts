
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUser1: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  identity_number: 'ID123456789',
  role: 'MEMBER'
};

const testUser2: CreateUserInput = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+0987654321',
  address: '456 Oak Ave',
  identity_number: 'ID987654321',
  role: 'ADMIN'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          ...testUser1,
          member_number: 'MEM001'
        },
        {
          ...testUser2,
          member_number: 'MEM002'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const user1 = result.find(u => u.email === 'john@example.com');
    expect(user1).toBeDefined();
    expect(user1!.name).toEqual('John Doe');
    expect(user1!.role).toEqual('MEMBER');
    expect(user1!.status).toEqual('PENDING_VERIFICATION');
    expect(user1!.member_number).toEqual('MEM001');
    expect(user1!.id).toBeDefined();
    expect(user1!.date_joined).toBeInstanceOf(Date);
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);
    expect(user1!.verified_at).toBeNull();

    // Check second user
    const user2 = result.find(u => u.email === 'jane@example.com');
    expect(user2).toBeDefined();
    expect(user2!.name).toEqual('Jane Smith');
    expect(user2!.role).toEqual('ADMIN');
    expect(user2!.identity_number).toEqual('ID987654321');
  });

  it('should return users with different statuses', async () => {
    // Create users with different statuses
    await db.insert(usersTable)
      .values([
        {
          ...testUser1,
          member_number: 'MEM001',
          status: 'ACTIVE',
          verified_at: new Date()
        },
        {
          ...testUser2,
          member_number: 'MEM002',
          status: 'SUSPENDED'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    const activeUser = result.find(u => u.status === 'ACTIVE');
    const suspendedUser = result.find(u => u.status === 'SUSPENDED');
    
    expect(activeUser).toBeDefined();
    expect(activeUser!.verified_at).toBeInstanceOf(Date);
    
    expect(suspendedUser).toBeDefined();
    expect(suspendedUser!.verified_at).toBeNull();
  });

  it('should preserve all user fields correctly', async () => {
    const testData = {
      ...testUser1,
      member_number: 'MEM001',
      status: 'ACTIVE' as const
    };

    await db.insert(usersTable)
      .values(testData)
      .execute();

    const result = await getUsers();
    const user = result[0];

    expect(user.name).toEqual(testData.name);
    expect(user.email).toEqual(testData.email);
    expect(user.phone).toEqual(testData.phone);
    expect(user.address).toEqual(testData.address);
    expect(user.identity_number).toEqual(testData.identity_number);
    expect(user.role).toEqual(testData.role);
    expect(user.status).toEqual(testData.status);
    expect(user.member_number).toEqual(testData.member_number);
    expect(typeof user.id).toBe('number');
  });
});
