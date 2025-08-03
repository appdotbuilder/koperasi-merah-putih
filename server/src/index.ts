
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createSavingsInputSchema,
  createLoanInputSchema,
  approveLoanInputSchema,
  processPaymentInputSchema,
  createVotingInputSchema,
  castVoteInputSchema,
  createNotificationInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { verifyUser } from './handlers/verify_user';
import { createSavings } from './handlers/create_savings';
import { getUserSavings } from './handlers/get_user_savings';
import { createLoan } from './handlers/create_loan';
import { approveLoan } from './handlers/approve_loan';
import { getLoans } from './handlers/get_loans';
import { calculateLoanSimulation } from './handlers/calculate_loan_simulation';
import { getPaymentSchedules } from './handlers/get_payment_schedules';
import { processPayment } from './handlers/process_payment';
import { getTransactions } from './handlers/get_transactions';
import { calculateSHU } from './handlers/calculate_shu';
import { distributeSHU } from './handlers/distribute_shu';
import { getUserSHU } from './handlers/get_user_shu';
import { createVoting } from './handlers/create_voting';
import { getVotings } from './handlers/get_votings';
import { castVote } from './handlers/cast_vote';
import { getVotingResults } from './handlers/get_voting_results';
import { createNotification } from './handlers/create_notification';
import { getUserNotifications } from './handlers/get_user_notifications';
import { markNotificationRead } from './handlers/mark_notification_read';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { generateFinancialReport } from './handlers/generate_financial_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  verifyUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => verifyUser(input.userId)),

  // Savings management
  createSavings: publicProcedure
    .input(createSavingsInputSchema)
    .mutation(({ input }) => createSavings(input)),
  
  getUserSavings: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserSavings(input.userId)),

  // Loan management
  createLoan: publicProcedure
    .input(createLoanInputSchema)
    .mutation(({ input }) => createLoan(input)),
  
  approveLoan: publicProcedure
    .input(approveLoanInputSchema.extend({ approvedBy: z.number() }))
    .mutation(({ input }) => approveLoan(input, input.approvedBy)),
  
  getLoans: publicProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(({ input }) => getLoans(input?.userId)),
  
  calculateLoanSimulation: publicProcedure
    .input(z.object({
      amount: z.number().positive(),
      interestRate: z.number().positive(),
      termMonths: z.number().int().positive()
    }))
    .query(({ input }) => calculateLoanSimulation(input.amount, input.interestRate, input.termMonths)),
  
  getPaymentSchedules: publicProcedure
    .input(z.object({ loanId: z.number() }))
    .query(({ input }) => getPaymentSchedules(input.loanId)),
  
  processPayment: publicProcedure
    .input(processPaymentInputSchema)
    .mutation(({ input }) => processPayment(input)),

  // Transaction management
  getTransactions: publicProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(({ input }) => getTransactions(input?.userId)),

  // SHU management
  calculateSHU: publicProcedure
    .input(z.object({
      year: z.number().int(),
      totalProfit: z.number(),
      calculatedBy: z.number()
    }))
    .mutation(({ input }) => calculateSHU(input.year, input.totalProfit, input.calculatedBy)),
  
  distributeSHU: publicProcedure
    .input(z.object({ shuCalculationId: z.number() }))
    .mutation(({ input }) => distributeSHU(input.shuCalculationId)),
  
  getUserSHU: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserSHU(input.userId)),

  // Voting management
  createVoting: publicProcedure
    .input(createVotingInputSchema.extend({ createdBy: z.number() }))
    .mutation(({ input }) => createVoting(input, input.createdBy)),
  
  getVotings: publicProcedure
    .query(() => getVotings()),
  
  castVote: publicProcedure
    .input(castVoteInputSchema)
    .mutation(({ input }) => castVote(input)),
  
  getVotingResults: publicProcedure
    .input(z.object({ votingId: z.number() }))
    .query(({ input }) => getVotingResults(input.votingId)),

  // Notification management
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),
  
  getUserNotifications: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserNotifications(input.userId)),
  
  markNotificationRead: publicProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(({ input }) => markNotificationRead(input.notificationId)),

  // Dashboard and reporting
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  
  generateFinancialReport: publicProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().optional()
    }))
    .query(({ input }) => generateFinancialReport(input.year, input.month)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Koperasi Merah Putih TRPC server listening at port: ${port}`);
}

start();
