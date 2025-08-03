
import { db } from '../db';
import { loansTable, usersTable } from '../db/schema';
import { type CreateLoanInput, type Loan } from '../schema';
import { eq } from 'drizzle-orm';

export const createLoan = async (input: CreateLoanInput): Promise<Loan> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Default interest rate (configurable in a real system)
    const defaultInterestRate = 12.0;
    const monthlyInterestRate = defaultInterestRate / 100 / 12;
    
    // Calculate monthly payment using loan payment formula
    // PMT = P * [r(1 + r)^n] / [(1 + r)^n - 1]
    // Where P = principal, r = monthly interest rate, n = number of payments
    const principal = input.amount;
    const numPayments = input.term_months;
    
    let monthlyPayment: number;
    if (monthlyInterestRate === 0) {
      // If no interest, just divide principal by term
      monthlyPayment = principal / numPayments;
    } else {
      const denominator = Math.pow(1 + monthlyInterestRate, numPayments) - 1;
      const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numPayments);
      monthlyPayment = principal * (numerator / denominator);
    }

    // Insert loan record
    const result = await db.insert(loansTable)
      .values({
        user_id: input.user_id,
        amount: input.amount.toString(),
        interest_rate: defaultInterestRate.toString(),
        term_months: input.term_months,
        monthly_payment: monthlyPayment.toString(),
        remaining_balance: input.amount.toString(),
        status: 'PENDING'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const loan = result[0];
    return {
      ...loan,
      amount: parseFloat(loan.amount),
      interest_rate: parseFloat(loan.interest_rate),
      monthly_payment: parseFloat(loan.monthly_payment),
      remaining_balance: parseFloat(loan.remaining_balance)
    };
  } catch (error) {
    console.error('Loan creation failed:', error);
    throw error;
  }
};
