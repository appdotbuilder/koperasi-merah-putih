
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserNotifications = async (userId: number): Promise<Notification[]> => {
  try {
    // Query notifications for the specific user, ordered by creation date (newest first)
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    // Return notifications (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Get user notifications failed:', error);
    throw error;
  }
};
