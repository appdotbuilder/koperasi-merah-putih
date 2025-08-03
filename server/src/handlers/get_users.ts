
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    // Convert date fields and return users
    return result.map(user => ({
      ...user,
      date_joined: new Date(user.date_joined),
      verified_at: user.verified_at ? new Date(user.verified_at) : null,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};
