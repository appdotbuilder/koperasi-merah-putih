
import { db } from '../db';
import { loansTable, paymentSchedulesTable } from '../db/schema';
import { type ApproveLoanInput, type Loan } from '../schema';
import { eq } from 'drizzle-orm';

export async function approveLoan(input: ApproveLoanInput, approvedBy: number): Promise<Loan> {
  try {
    // First, fetch the loan to verify it exists and is in PENDING status
    const existingLoans = await db.select()
      .from(loansTable)
      .where(eq(loansTable.id, input.loan_id))
      .execute();

    if (existingLoans.length === 0) {
      throw new Error('Loan not found');
    }

    const existingLoan = existingLoans[0];
    if (existingLoan.status !== 'PENDING') {
      throw new Error('Loan is not pending approval');
    }

    let updatedLoan: Loan;

    if (input.approved) {
      // Calculate loan parameters
      const interestRate = input.interest_rate || 12.0; // Default 12% annual rate
      const monthlyInterestRate = interestRate / 100 / 12;
      const loanAmount = parseFloat(existingLoan.amount);
      const termMonths = existingLoan.term_months;

      // Calculate monthly payment using loan formula
      const monthlyPayment = loanAmount * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths)) /
        (Math.pow(1 + monthlyInterestRate, termMonths) - 1);

      // Update loan to approved status
      const result = await db.update(loansTable)
        .set({
          status: 'APPROVED',
          interest_rate: interestRate.toString(),
          monthly_payment: monthlyPayment.toString(),
          remaining_balance: existingLoan.amount, // Initially same as loan amount
          approved_at: new Date(),
          approved_by: approvedBy,
          updated_at: new Date()
        })
        .where(eq(loansTable.id, input.loan_id))
        .returning()
        .execute();

      updatedLoan = {
        ...result[0],
        amount: parseFloat(result[0].amount),
        interest_rate: parseFloat(result[0].interest_rate),
        monthly_payment: parseFloat(result[0].monthly_payment),
        remaining_balance: parseFloat(result[0].remaining_balance)
      };

      // Generate payment schedule
      const schedules = [];
      let remainingPrincipal = loanAmount;
      const currentDate = new Date();

      for (let i = 1; i <= termMonths; i++) {
        const dueDate = new Date(currentDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const interestAmount = remainingPrincipal * monthlyInterestRate;
        const principalAmount = monthlyPayment - interestAmount;
        remainingPrincipal -= principalAmount;

        // Ensure the last payment covers any remaining balance due to rounding
        const adjustedPrincipalAmount = i === termMonths 
          ? principalAmount + remainingPrincipal 
          : principalAmount;
        const adjustedTotalAmount = i === termMonths
          ? adjustedPrincipalAmount + interestAmount
          : monthlyPayment;

        schedules.push({
          loan_id: input.loan_id,
          installment_number: i,
          due_date: dueDate,
          principal_amount: adjustedPrincipalAmount.toString(),
          interest_amount: interestAmount.toString(),
          total_amount: adjustedTotalAmount.toString(),
          paid_amount: '0',
          status: 'PENDING' as const,
          late_fee: '0'
        });

        if (i === termMonths) {
          remainingPrincipal = 0; // Reset for final payment
        }
      }

      // Insert payment schedules
      await db.insert(paymentSchedulesTable)
        .values(schedules)
        .execute();

    } else {
      // Reject the loan
      const result = await db.update(loansTable)
        .set({
          status: 'REJECTED',
          approved_at: new Date(),
          approved_by: approvedBy,
          updated_at: new Date()
        })
        .where(eq(loansTable.id, input.loan_id))
        .returning()
        .execute();

      updatedLoan = {
        ...result[0],
        amount: parseFloat(result[0].amount),
        interest_rate: parseFloat(result[0].interest_rate),
        monthly_payment: parseFloat(result[0].monthly_payment),
        remaining_balance: parseFloat(result[0].remaining_balance)
      };
    }

    return updatedLoan;
  } catch (error) {
    console.error('Loan approval failed:', error);
    throw error;
  }
}
