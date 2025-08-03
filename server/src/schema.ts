
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['MEMBER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User status enum
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  member_number: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  identity_number: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  date_joined: z.coerce.date(),
  verified_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  identity_number: z.string().min(1),
  role: userRoleSchema.default('MEMBER')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Update user input schema
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  identity_number: z.string().optional(),
  status: userStatusSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Savings type enum
export const savingsTypeSchema = z.enum(['MANDATORY', 'VOLUNTARY', 'SPECIAL']);
export type SavingsType = z.infer<typeof savingsTypeSchema>;

// Savings schema
export const savingsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: savingsTypeSchema,
  amount: z.number(),
  balance: z.number(),
  description: z.string().nullable(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Savings = z.infer<typeof savingsSchema>;

// Create savings input schema
export const createSavingsInputSchema = z.object({
  user_id: z.number(),
  type: savingsTypeSchema,
  amount: z.number().positive(),
  description: z.string().nullable()
});

export type CreateSavingsInput = z.infer<typeof createSavingsInputSchema>;

// Loan status enum
export const loanStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'OVERDUE']);
export type LoanStatus = z.infer<typeof loanStatusSchema>;

// Loan schema
export const loanSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  interest_rate: z.number(),
  term_months: z.number().int(),
  monthly_payment: z.number(),
  remaining_balance: z.number(),
  status: loanStatusSchema,
  applied_at: z.coerce.date(),
  approved_at: z.coerce.date().nullable(),
  approved_by: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Loan = z.infer<typeof loanSchema>;

// Create loan input schema
export const createLoanInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  term_months: z.number().int().positive(),
  purpose: z.string().min(1)
});

export type CreateLoanInput = z.infer<typeof createLoanInputSchema>;

// Loan approval input schema
export const approveLoanInputSchema = z.object({
  loan_id: z.number(),
  approved: z.boolean(),
  interest_rate: z.number().positive().optional(),
  notes: z.string().optional()
});

export type ApproveLoanInput = z.infer<typeof approveLoanInputSchema>;

// Payment status enum
export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'LATE', 'MISSED']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Payment schedule schema
export const paymentScheduleSchema = z.object({
  id: z.number(),
  loan_id: z.number(),
  installment_number: z.number().int(),
  due_date: z.coerce.date(),
  principal_amount: z.number(),
  interest_amount: z.number(),
  total_amount: z.number(),
  paid_amount: z.number(),
  paid_date: z.coerce.date().nullable(),
  status: paymentStatusSchema,
  late_fee: z.number(),
  created_at: z.coerce.date()
});

export type PaymentSchedule = z.infer<typeof paymentScheduleSchema>;

// Process payment input schema
export const processPaymentInputSchema = z.object({
  schedule_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.string(),
  notes: z.string().optional()
});

export type ProcessPaymentInput = z.infer<typeof processPaymentInputSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['SAVINGS_DEPOSIT', 'LOAN_DISBURSEMENT', 'LOAN_PAYMENT', 'SHU_DISTRIBUTION', 'ADMINISTRATIVE']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: transactionTypeSchema,
  amount: z.number(),
  description: z.string(),
  reference_id: z.number().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// SHU calculation schema
export const shuCalculationSchema = z.object({
  id: z.number(),
  year: z.number().int(),
  total_profit: z.number(),
  member_share_percentage: z.number(),
  total_member_share: z.number(),
  calculated_at: z.coerce.date(),
  calculated_by: z.number(),
  distributed: z.boolean()
});

export type SHUCalculation = z.infer<typeof shuCalculationSchema>;

// SHU distribution schema
export const shuDistributionSchema = z.object({
  id: z.number(),
  shu_calculation_id: z.number(),
  user_id: z.number(),
  savings_contribution: z.number(),
  loan_contribution: z.number(),
  share_amount: z.number(),
  distributed_at: z.coerce.date().nullable()
});

export type SHUDistribution = z.infer<typeof shuDistributionSchema>;

// Voting status enum
export const votingStatusSchema = z.enum(['ACTIVE', 'CLOSED', 'CANCELLED']);
export type VotingStatus = z.infer<typeof votingStatusSchema>;

// Voting schema
export const votingSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  options: z.array(z.string()),
  status: votingStatusSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type Voting = z.infer<typeof votingSchema>;

// Create voting input schema
export const createVotingInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  options: z.array(z.string()).min(2),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type CreateVotingInput = z.infer<typeof createVotingInputSchema>;

// Vote schema
export const voteSchema = z.object({
  id: z.number(),
  voting_id: z.number(),
  user_id: z.number(),
  selected_option: z.string(),
  voted_at: z.coerce.date()
});

export type Vote = z.infer<typeof voteSchema>;

// Cast vote input schema
export const castVoteInputSchema = z.object({
  voting_id: z.number(),
  user_id: z.number(),
  selected_option: z.string()
});

export type CastVoteInput = z.infer<typeof castVoteInputSchema>;

// Notification type enum
export const notificationTypeSchema = z.enum(['PAYMENT_DUE', 'LOAN_APPROVED', 'MEETING_REMINDER', 'SHU_DISTRIBUTION', 'GENERAL']);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

// Create notification input schema
export const createNotificationInputSchema = z.object({
  user_id: z.number(),
  type: notificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1)
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
