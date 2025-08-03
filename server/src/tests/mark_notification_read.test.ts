
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { type CreateUserInput, type CreateNotificationInput } from '../schema';
import { markNotificationRead } from '../handlers/mark_notification_read';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '123456789',
  address: '123 Test St',
  identity_number: 'ID123456789',
  role: 'MEMBER'
};

const testNotification: CreateNotificationInput = {
  user_id: 1,
  type: 'GENERAL',
  title: 'Test Notification',
  message: 'This is a test notification message'
};

describe('markNotificationRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark notification as read', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        type: testNotification.type,
        title: testNotification.title,
        message: testNotification.message,
        read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read
    const result = await markNotificationRead(notificationId);

    // Verify the notification is marked as read
    expect(result.id).toBe(notificationId);
    expect(result.read).toBe(true);
    expect(result.title).toBe('Test Notification');
    expect(result.message).toBe('This is a test notification message');
    expect(result.type).toBe('GENERAL');
    expect(result.user_id).toBe(userId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should persist read status in database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM002',
        name: testUser.name,
        email: 'test2@example.com',
        phone: testUser.phone,
        address: testUser.address,
        identity_number: 'ID987654321',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        type: testNotification.type,
        title: testNotification.title,
        message: testNotification.message,
        read: false
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read
    await markNotificationRead(notificationId);

    // Verify the change is persisted in the database
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].read).toBe(true);
    expect(notifications[0].id).toBe(notificationId);
  });

  it('should throw error for non-existent notification', async () => {
    // Try to mark a non-existent notification as read
    const nonExistentId = 99999;

    await expect(markNotificationRead(nonExistentId))
      .rejects.toThrow(/notification with id 99999 not found/i);
  });

  it('should handle already read notification', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'MEM003',
        name: testUser.name,
        email: 'test3@example.com',
        phone: testUser.phone,
        address: testUser.address,
        identity_number: 'ID555666777',
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create notification that's already read
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: userId,
        type: testNotification.type,
        title: testNotification.title,
        message: testNotification.message,
        read: true // Already read
      })
      .returning()
      .execute();

    const notificationId = notificationResult[0].id;

    // Mark notification as read again
    const result = await markNotificationRead(notificationId);

    // Should still work and return the notification
    expect(result.id).toBe(notificationId);
    expect(result.read).toBe(true);
    expect(result.title).toBe('Test Notification');
  });
});
