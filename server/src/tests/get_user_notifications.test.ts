
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notificationsTable } from '../db/schema';
import { type CreateUserInput, type CreateNotificationInput } from '../schema';
import { getUserNotifications } from '../handlers/get_user_notifications';

// Test user data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  identity_number: 'ID123456',
  role: 'MEMBER'
};

// Test notification data
const testNotification: CreateNotificationInput = {
  user_id: 1,
  type: 'GENERAL',
  title: 'Test Notification',
  message: 'This is a test notification'
};

describe('getUserNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no notifications', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    const result = await getUserNotifications(1);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return notifications for specific user', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    // Create notifications for the user
    await db.insert(notificationsTable)
      .values([
        {
          user_id: 1,
          type: 'GENERAL',
          title: 'First Notification',
          message: 'This is the first notification'
        },
        {
          user_id: 1,
          type: 'PAYMENT_DUE',
          title: 'Payment Due',
          message: 'Your payment is due soon'
        }
      ])
      .execute();

    const result = await getUserNotifications(1);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBeDefined();
    expect(result[0].message).toBeDefined();
    expect(result[0].type).toBeDefined();
    expect(result[0].user_id).toEqual(1);
    expect(result[0].read).toEqual(false);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return notifications ordered by creation date (newest first)', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    // Create notifications with slight delay to ensure different timestamps
    await db.insert(notificationsTable)
      .values({
        user_id: 1,
        type: 'GENERAL',
        title: 'First Notification',
        message: 'This was created first'
      })
      .execute();

    // Add small delay
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(notificationsTable)
      .values({
        user_id: 1,
        type: 'PAYMENT_DUE',
        title: 'Second Notification',
        message: 'This was created second'
      })
      .execute();

    const result = await getUserNotifications(1);

    expect(result).toHaveLength(2);
    // The second notification should come first (newest first)
    expect(result[0].title).toEqual('Second Notification');
    expect(result[1].title).toEqual('First Notification');
    // Verify ordering by checking timestamps
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should only return notifications for specified user', async () => {
    // Create two users
    await db.insert(usersTable)
      .values([
        {
          member_number: 'MEM001',
          name: 'User One',
          email: 'user1@example.com',
          phone: '+1234567890',
          address: '123 Test St',
          identity_number: 'ID123456',
          role: 'MEMBER'
        },
        {
          member_number: 'MEM002',
          name: 'User Two',
          email: 'user2@example.com',
          phone: '+0987654321',
          address: '456 Test Ave',
          identity_number: 'ID654321',
          role: 'MEMBER'
        }
      ])
      .execute();

    // Create notifications for both users
    await db.insert(notificationsTable)
      .values([
        {
          user_id: 1,
          type: 'GENERAL',
          title: 'Notification for User 1',
          message: 'This is for user 1'
        },
        {
          user_id: 2,
          type: 'GENERAL',
          title: 'Notification for User 2',
          message: 'This is for user 2'
        },
        {
          user_id: 1,
          type: 'PAYMENT_DUE',
          title: 'Another for User 1',
          message: 'Another notification for user 1'
        }
      ])
      .execute();

    const resultUser1 = await getUserNotifications(1);
    const resultUser2 = await getUserNotifications(2);

    // User 1 should have 2 notifications
    expect(resultUser1).toHaveLength(2);
    expect(resultUser1[0].user_id).toEqual(1);
    expect(resultUser1[1].user_id).toEqual(1);

    // User 2 should have 1 notification
    expect(resultUser2).toHaveLength(1);
    expect(resultUser2[0].user_id).toEqual(2);
    expect(resultUser2[0].title).toEqual('Notification for User 2');
  });

  it('should handle user with mixed read/unread notifications', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        member_number: 'MEM001',
        name: testUser.name,
        email: testUser.email,
        phone: testUser.phone,
        address: testUser.address,
        identity_number: testUser.identity_number,
        role: testUser.role
      })
      .execute();

    // Create notifications with different read status
    await db.insert(notificationsTable)
      .values([
        {
          user_id: 1,
          type: 'GENERAL',
          title: 'Unread Notification',
          message: 'This is unread',
          read: false
        },
        {
          user_id: 1,
          type: 'PAYMENT_DUE',
          title: 'Read Notification',
          message: 'This is read',
          read: true
        }
      ])
      .execute();

    const result = await getUserNotifications(1);

    expect(result).toHaveLength(2);
    
    // Find each notification by title
    const unreadNotification = result.find(n => n.title === 'Unread Notification');
    const readNotification = result.find(n => n.title === 'Read Notification');

    expect(unreadNotification).toBeDefined();
    expect(unreadNotification!.read).toEqual(false);
    expect(readNotification).toBeDefined();
    expect(readNotification!.read).toEqual(true);
  });
});
