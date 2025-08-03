
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['MEMBER', 'ADMIN']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED']);
export const savingsTypeEnum = pgEnum('savings_type', ['MANDATORY', 'VOLUNTARY', 'SPECIAL']);
export const loanStatusEnum = pgEnum('loan_status', ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'OVERDUE']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'LATE', 'MISSED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['SAVINGS_DEPOSIT', 'LOAN_DISBURSEMENT', 'LOAN_PAYMENT', 'SHU_DISTRIBUTION', 'ADMINISTRATIVE']);
export const votingStatusEnum = pgEnum('voting_status', ['ACTIVE', 'CLOSED', 'CANCELLED']);
export const notificationTypeEnum = pgEnum('notification_type', ['PAYMENT_DUE', 'LOAN_APPROVED', 'MEETING_REMINDER', 'SHU_DISTRIBUTION', 'GENERAL']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  member_number: text('member_number').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  identity_number: text('identity_number').notNull().unique(),
  role: userRoleEnum('role').notNull().default('MEMBER'),
  status: userStatusEnum('status').notNull().default('PENDING_VERIFICATION'),
  date_joined: timestamp('date_joined').notNull().defaultNow(),
  verified_at: timestamp('verified_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

// Savings table
export const savingsTable = pgTable('savings', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  type: savingsTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  transaction_date: timestamp('transaction_date').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow()
});

// Loans table
export const loansTable = pgTable('loans', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  interest_rate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(),
  term_months: integer('term_months').notNull(),
  monthly_payment: numeric('monthly_payment', { precision: 15, scale: 2 }).notNull(),
  remaining_balance: numeric('remaining_balance', { precision: 15, scale: 2 }).notNull(),
  status: loanStatusEnum('status').notNull().default('PENDING'),
  applied_at: timestamp('applied_at').notNull().defaultNow(),
  approved_at: timestamp('approved_at'),
  approved_by: integer('approved_by').references(() => usersTable.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
});

// Payment schedules table
export const paymentSchedulesTable = pgTable('payment_schedules', {
  id: serial('id').primaryKey(),
  loan_id: integer('loan_id').notNull().references(() => loansTable.id),
  installment_number: integer('installment_number').notNull(),
  due_date: timestamp('due_date').notNull(),
  principal_amount: numeric('principal_amount', { precision: 15, scale: 2 }).notNull(),
  interest_amount: numeric('interest_amount', { precision: 15, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  paid_amount: numeric('paid_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  paid_date: timestamp('paid_date'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  late_fee: numeric('late_fee', { precision: 15, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').notNull().defaultNow()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description').notNull(),
  reference_id: integer('reference_id'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').notNull().defaultNow()
});

// SHU calculations table
export const shuCalculationsTable = pgTable('shu_calculations', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  total_profit: numeric('total_profit', { precision: 15, scale: 2 }).notNull(),
  member_share_percentage: numeric('member_share_percentage', { precision: 5, scale: 2 }).notNull(),
  total_member_share: numeric('total_member_share', { precision: 15, scale: 2 }).notNull(),
  calculated_at: timestamp('calculated_at').notNull().defaultNow(),
  calculated_by: integer('calculated_by').notNull().references(() => usersTable.id),
  distributed: boolean('distributed').notNull().default(false)
});

// SHU distributions table
export const shuDistributionsTable = pgTable('shu_distributions', {
  id: serial('id').primaryKey(),
  shu_calculation_id: integer('shu_calculation_id').notNull().references(() => shuCalculationsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  savings_contribution: numeric('savings_contribution', { precision: 15, scale: 2 }).notNull(),
  loan_contribution: numeric('loan_contribution', { precision: 15, scale: 2 }).notNull(),
  share_amount: numeric('share_amount', { precision: 15, scale: 2 }).notNull(),
  distributed_at: timestamp('distributed_at')
});

// Votings table
export const votingsTable = pgTable('votings', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  options: jsonb('options').notNull(),
  status: votingStatusEnum('status').notNull().default('ACTIVE'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').notNull().defaultNow()
});

// Votes table
export const votesTable = pgTable('votes', {
  id: serial('id').primaryKey(),
  voting_id: integer('voting_id').notNull().references(() => votingsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  selected_option: text('selected_option').notNull(),
  voted_at: timestamp('voted_at').notNull().defaultNow()
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  savings: many(savingsTable),
  loans: many(loansTable),
  transactions: many(transactionsTable),
  shuDistributions: many(shuDistributionsTable),
  votes: many(votesTable),
  notifications: many(notificationsTable)
}));

export const savingsRelations = relations(savingsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [savingsTable.user_id],
    references: [usersTable.id]
  })
}));

export const loansRelations = relations(loansTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [loansTable.user_id],
    references: [usersTable.id]
  }),
  approvedBy: one(usersTable, {
    fields: [loansTable.approved_by],
    references: [usersTable.id]
  }),
  paymentSchedules: many(paymentSchedulesTable)
}));

export const paymentSchedulesRelations = relations(paymentSchedulesTable, ({ one }) => ({
  loan: one(loansTable, {
    fields: [paymentSchedulesTable.loan_id],
    references: [loansTable.id]
  })
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [transactionsTable.created_by],
    references: [usersTable.id]
  })
}));

export const shuCalculationsRelations = relations(shuCalculationsTable, ({ one, many }) => ({
  calculatedBy: one(usersTable, {
    fields: [shuCalculationsTable.calculated_by],
    references: [usersTable.id]
  }),
  distributions: many(shuDistributionsTable)
}));

export const shuDistributionsRelations = relations(shuDistributionsTable, ({ one }) => ({
  shuCalculation: one(shuCalculationsTable, {
    fields: [shuDistributionsTable.shu_calculation_id],
    references: [shuCalculationsTable.id]
  }),
  user: one(usersTable, {
    fields: [shuDistributionsTable.user_id],
    references: [usersTable.id]
  })
}));

export const votingsRelations = relations(votingsTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [votingsTable.created_by],
    references: [usersTable.id]
  }),
  votes: many(votesTable)
}));

export const votesRelations = relations(votesTable, ({ one }) => ({
  voting: one(votingsTable, {
    fields: [votesTable.voting_id],
    references: [votingsTable.id]
  }),
  user: one(usersTable, {
    fields: [votesTable.user_id],
    references: [usersTable.id]
  })
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  savings: savingsTable,
  loans: loansTable,
  paymentSchedules: paymentSchedulesTable,
  transactions: transactionsTable,
  shuCalculations: shuCalculationsTable,
  shuDistributions: shuDistributionsTable,
  votings: votingsTable,
  votes: votesTable,
  notifications: notificationsTable
};
