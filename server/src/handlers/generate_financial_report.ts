
import { db } from '../db';
import { savingsTable, loansTable, paymentSchedulesTable, transactionsTable } from '../db/schema';
import { sql, sum, eq, gte, lt, and } from 'drizzle-orm';

interface FinancialReport {
    period: string;
    balance_sheet: {
        assets: {
            cash: number;
            loans_receivable: number;
            other_assets: number;
            total_assets: number;
        };
        liabilities: {
            member_savings: number;
            other_liabilities: number;
            total_liabilities: number;
        };
        equity: {
            retained_earnings: number;
            current_period_surplus: number;
            total_equity: number;
        };
    };
    income_statement: {
        revenues: {
            interest_income: number;
            other_income: number;
            total_revenue: number;
        };
        expenses: {
            operational_expenses: number;
            interest_expenses: number;
            other_expenses: number;
            total_expenses: number;
        };
        net_income: number;
    };
}

export const generateFinancialReport = async (year: number, month?: number): Promise<FinancialReport> => {
    try {
        // Define period boundaries
        let startDate: Date;
        let endDate: Date;
        let period: string;

        if (month) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 1);
            period = `${year}-${month.toString().padStart(2, '0')}`;
        } else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year + 1, 0, 1);
            period = year.toString();
        }

        // Calculate member savings (total current balances)
        const savingsResult = await db.select({
            total: sum(savingsTable.balance)
        }).from(savingsTable).execute();

        const memberSavings = savingsResult[0]?.total ? parseFloat(savingsResult[0].total) : 0;

        // Calculate loans receivable (remaining balances for active loans)
        const loansResult = await db.select({
            total: sum(loansTable.remaining_balance)
        })
        .from(loansTable)
        .where(eq(loansTable.status, 'ACTIVE'))
        .execute();

        const loansReceivable = loansResult[0]?.total ? parseFloat(loansResult[0].total) : 0;

        // Calculate interest income from loan payments in the period
        const interestIncomeResult = await db.select({
            total: sum(paymentSchedulesTable.interest_amount)
        })
        .from(paymentSchedulesTable)
        .where(
            and(
                eq(paymentSchedulesTable.status, 'PAID'),
                gte(paymentSchedulesTable.paid_date, startDate),
                lt(paymentSchedulesTable.paid_date, endDate)
            )
        )
        .execute();

        const interestIncome = interestIncomeResult[0]?.total ? parseFloat(interestIncomeResult[0].total) : 0;

        // Calculate loan disbursements (cash outflow) in the period
        const disbursementsResult = await db.select({
            total: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .where(
            and(
                eq(transactionsTable.type, 'LOAN_DISBURSEMENT'),
                gte(transactionsTable.created_at, startDate),
                lt(transactionsTable.created_at, endDate)
            )
        )
        .execute();

        const disbursements = disbursementsResult[0]?.total ? parseFloat(disbursementsResult[0].total) : 0;

        // Calculate loan payments received (cash inflow) in the period
        const paymentsResult = await db.select({
            total: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .where(
            and(
                eq(transactionsTable.type, 'LOAN_PAYMENT'),
                gte(transactionsTable.created_at, startDate),
                lt(transactionsTable.created_at, endDate)
            )
        )
        .execute();

        const paymentsReceived = paymentsResult[0]?.total ? parseFloat(paymentsResult[0].total) : 0;

        // Calculate savings deposits in the period
        const depositsResult = await db.select({
            total: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .where(
            and(
                eq(transactionsTable.type, 'SAVINGS_DEPOSIT'),
                gte(transactionsTable.created_at, startDate),
                lt(transactionsTable.created_at, endDate)
            )
        )
        .execute();

        const deposits = depositsResult[0]?.total ? parseFloat(depositsResult[0].total) : 0;

        // Calculate operational expenses (administrative transactions) in the period
        const operationalExpensesResult = await db.select({
            total: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .where(
            and(
                eq(transactionsTable.type, 'ADMINISTRATIVE'),
                gte(transactionsTable.created_at, startDate),
                lt(transactionsTable.created_at, endDate)
            )
        )
        .execute();

        const operationalExpenses = operationalExpensesResult[0]?.total ? parseFloat(operationalExpensesResult[0].total) : 0;

        // Estimate cash based on net flows
        // Starting assumption: cash = member savings + net loan flows + net deposits - operational expenses
        const cash = memberSavings + paymentsReceived - disbursements + deposits - operationalExpenses;

        // Calculate totals
        const totalAssets = cash + loansReceivable;
        const totalLiabilities = memberSavings;
        const totalRevenue = interestIncome;
        const totalExpenses = operationalExpenses;
        const netIncome = totalRevenue - totalExpenses;
        const totalEquity = totalAssets - totalLiabilities;

        return {
            period,
            balance_sheet: {
                assets: {
                    cash,
                    loans_receivable: loansReceivable,
                    other_assets: 0,
                    total_assets: totalAssets
                },
                liabilities: {
                    member_savings: memberSavings,
                    other_liabilities: 0,
                    total_liabilities: totalLiabilities
                },
                equity: {
                    retained_earnings: totalEquity - netIncome,
                    current_period_surplus: netIncome,
                    total_equity: totalEquity
                }
            },
            income_statement: {
                revenues: {
                    interest_income: interestIncome,
                    other_income: 0,
                    total_revenue: totalRevenue
                },
                expenses: {
                    operational_expenses: operationalExpenses,
                    interest_expenses: 0,
                    other_expenses: 0,
                    total_expenses: totalExpenses
                },
                net_income: netIncome
            }
        };
    } catch (error) {
        console.error('Financial report generation failed:', error);
        throw error;
    }
};
