
import { db } from '../db';
import { 
  usersTable, 
  savingsTable, 
  loansTable, 
  paymentSchedulesTable,
  shuDistributionsTable,
  transactionsTable 
} from '../db/schema';
import { count, sum, and, eq, lt } from 'drizzle-orm';

interface DashboardStats {
    total_members: number;
    active_members: number;
    total_savings: number;
    total_loans: number;
    active_loans: number;
    overdue_payments: number;
    pending_loan_applications: number;
    total_shu_distributed: number;
    cash_balance: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        // Get member statistics
        const totalMembersResult = await db
            .select({ count: count() })
            .from(usersTable)
            .execute();

        const activeMembersResult = await db
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.status, 'ACTIVE'))
            .execute();

        // Get total savings balance - sum of all savings balances
        const totalSavingsResult = await db
            .select({ total: sum(savingsTable.balance) })
            .from(savingsTable)
            .execute();

        // Get loan statistics
        const totalLoansResult = await db
            .select({ total: sum(loansTable.amount) })
            .from(loansTable)
            .execute();

        const activeLoansResult = await db
            .select({ count: count() })
            .from(loansTable)
            .where(eq(loansTable.status, 'ACTIVE'))
            .execute();

        const pendingLoanApplicationsResult = await db
            .select({ count: count() })
            .from(loansTable)
            .where(eq(loansTable.status, 'PENDING'))
            .execute();

        // Get overdue payments - payments past due date with PENDING status
        const today = new Date();
        const overduePaymentsResult = await db
            .select({ count: count() })
            .from(paymentSchedulesTable)
            .where(
                and(
                    eq(paymentSchedulesTable.status, 'PENDING'),
                    lt(paymentSchedulesTable.due_date, today)
                )
            )
            .execute();

        // Get total SHU distributed
        const totalShuDistributedResult = await db
            .select({ total: sum(shuDistributionsTable.share_amount) })
            .from(shuDistributionsTable)
            .execute();

        // Calculate cash balance: total savings deposits minus total loan disbursements
        const savingsDepositsResult = await db
            .select({ total: sum(transactionsTable.amount) })
            .from(transactionsTable)
            .where(eq(transactionsTable.type, 'SAVINGS_DEPOSIT'))
            .execute();

        const loanDisbursementsResult = await db
            .select({ total: sum(transactionsTable.amount) })
            .from(transactionsTable)
            .where(eq(transactionsTable.type, 'LOAN_DISBURSEMENT'))
            .execute();

        // Convert numeric strings to numbers and handle null values
        const totalMembers = totalMembersResult[0]?.count || 0;
        const activeMembers = activeMembersResult[0]?.count || 0;
        const totalSavings = totalSavingsResult[0]?.total ? parseFloat(totalSavingsResult[0].total) : 0;
        const totalLoans = totalLoansResult[0]?.total ? parseFloat(totalLoansResult[0].total) : 0;
        const activeLoans = activeLoansResult[0]?.count || 0;
        const overduePayments = overduePaymentsResult[0]?.count || 0;
        const pendingLoanApplications = pendingLoanApplicationsResult[0]?.count || 0;
        const totalShuDistributed = totalShuDistributedResult[0]?.total ? parseFloat(totalShuDistributedResult[0].total) : 0;
        
        const savingsDeposits = savingsDepositsResult[0]?.total ? parseFloat(savingsDepositsResult[0].total) : 0;
        const loanDisbursements = loanDisbursementsResult[0]?.total ? parseFloat(loanDisbursementsResult[0].total) : 0;
        const cashBalance = savingsDeposits - loanDisbursements;

        return {
            total_members: totalMembers,
            active_members: activeMembers,
            total_savings: totalSavings,
            total_loans: totalLoans,
            active_loans: activeLoans,
            overdue_payments: overduePayments,
            pending_loan_applications: pendingLoanApplications,
            total_shu_distributed: totalShuDistributed,
            cash_balance: cashBalance
        };
    } catch (error) {
        console.error('Dashboard stats retrieval failed:', error);
        throw error;
    }
}
