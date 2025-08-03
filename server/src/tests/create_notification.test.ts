
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput } from '../schema';
import { createNotification } from '../handlers/create_notification';
import { eq } from 'drizzle-orm';

describe('createNotification', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        member_number: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address: 'Test Address',
        identity_number: 'ID123456789',
        role: 'MEMBER',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a notification', async () => {
    const testInput: CreateNotificationInput = {
      user_id: testUserId,
      type: 'GENERAL',
      title: 'Test Notification',
      message: 'This is a test notification message'
    };

    const result = await createNotification(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.type).toEqual('GENERAL');
    expect(result.title).toEqual('Test Notification');
    expect(result.message).toEqual('This is a test notification message');
    expect(result.read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save notification to database', async () => {
    const testInput: CreateNotificationInput = {
      user_id: testUserId,
      type: 'PAYMENT_DUE',
      title: 'Payment Due',
      message: 'Your loan payment is due tomorrow'
    };

    const result = await createNotification(testInput);

    // Query database to verify notification was saved
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toEqual(testUserId);
    expect(notifications[0].type).toEqual('PAYMENT_DUE');
    expect(notifications[0].title).toEqual('Payment Due');
    expect(notifications[0].message).toEqual('Your loan payment is due tomorrow');
    expect(notifications[0].read).toEqual(false);
    expect(notifications[0].created_at).toBeInstanceOf(Date);
  });

  it('should create different notification types', async () => {
    const testInputs: CreateNotificationInput[] = [
      {
        user_id: testUserId,
        type: 'LOAN_APPROVED',
        title: 'Loan Approved',
        message: 'Your loan application has been approved'
      },
      {
        user_id: testUserId,
        type: 'MEETING_REMINDER',
        title: 'Meeting Tomorrow',
        message: 'Don\'t forget about the monthly meeting tomorrow'
      },
      {
        user_id: testUserId,
        type: 'SHU_DISTRIBUTION',
        title: 'SHU Distribution',
        message: 'Your SHU share has been calculated'
      }
    ];

    const results = await Promise.all(
      testInputs.map(input => createNotification(input))
    );

    // Verify all notifications were created with correct types
    expect(results).toHaveLength(3);
    expect(results[0].type).toEqual('LOAN_APPROVED');
    expect(results[1].type).toEqual('MEETING_REMINDER');
    expect(results[2].type).toEqual('SHU_DISTRIBUTION');

    // Verify all are unread by default
    results.forEach(notification => {
      expect(notification.read).toEqual(false);
    });
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateNotificationInput = {
      user_id: 99999, // Non-existent user ID
      type: 'GENERAL',
      title: 'Test Notification',
      message: 'This should fail'
    };

    await expect(createNotification(testInput)).rejects.toThrow(/foreign key/i);
  });
});
