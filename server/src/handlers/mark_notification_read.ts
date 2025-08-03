
import { db } from '../db';
import { notificationsTable } from '../db/schema';
import { type Notification } from '../schema';
import { eq } from 'drizzle-orm';

export const markNotificationRead = async (notificationId: number): Promise<Notification> => {
  try {
    // Update the notification's read status
    const result = await db.update(notificationsTable)
      .set({ 
        read: true 
      })
      .where(eq(notificationsTable.id, notificationId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};
