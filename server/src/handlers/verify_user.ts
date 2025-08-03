
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function verifyUser(userId: number): Promise<User> {
  try {
    // Update user status to ACTIVE and set verified_at timestamp
    const result = await db.update(usersTable)
      .set({
        status: 'ACTIVE',
        verified_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = result[0];
    return {
      ...user,
      // No numeric conversions needed for users table - all fields are appropriate types
    };
  } catch (error) {
    console.error('User verification failed:', error);
    throw error;
  }
}
