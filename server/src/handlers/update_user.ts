
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Prepare update data - only include defined fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.email !== undefined) {
      updateData['email'] = input.email;
    }
    if (input.phone !== undefined) {
      updateData['phone'] = input.phone;
    }
    if (input.address !== undefined) {
      updateData['address'] = input.address;
    }
    if (input.identity_number !== undefined) {
      updateData['identity_number'] = input.identity_number;
    }
    if (input.status !== undefined) {
      updateData['status'] = input.status;
      
      // If status is being changed to ACTIVE, set verified_at
      if (input.status === 'ACTIVE' && !existingUser[0].verified_at) {
        updateData['verified_at'] = new Date();
      }
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
