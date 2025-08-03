
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { calculateLoanSimulation } from '../handlers/calculate_loan_simulation';

describe('calculateLoanSimulation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate loan simulation with interest', async () => {
    const result = await calculateLoanSimulation(100000, 12, 12);

    // Verify basic structure
    expect(result.monthly_payment).toBeGreaterThan(0);
    expect(result.total_payment).toBeGreaterThan(100000);
    expect(result.total_interest).toBeGreaterThan(0);
    expect(result.payment_schedule).toHaveLength(12);

    // Verify monthly payment calculation (approximately 8,885 for this loan)
    expect(result.monthly_payment).toBeCloseTo(8884.88, 1);
    
    // Verify total calculations
    expect(result.total_payment).toBeCloseTo(result.monthly_payment * 12, 2);
    expect(result.total_interest).toBeCloseTo(result.total_payment - 100000, 2);
  });

  it('should calculate loan simulation without interest', async () => {
    const result = await calculateLoanSimulation(120000, 0, 24);

    // With 0% interest, monthly payment should be amount / term
    expect(result.monthly_payment).toBe(5000);
    expect(result.total_payment).toBe(120000);
    expect(result.total_interest).toBe(0);
    expect(result.payment_schedule).toHaveLength(24);

    // Verify all payments are equal with no interest
    result.payment_schedule.forEach(payment => {
      expect(payment.principal).toBe(5000);
      expect(payment.interest).toBe(0);
      expect(payment.total).toBe(5000);
    });
  });

  it('should generate correct payment schedule structure', async () => {
    const result = await calculateLoanSimulation(60000, 15, 6);

    expect(result.payment_schedule).toHaveLength(6);

    // Verify each payment has required fields
    result.payment_schedule.forEach((payment, index) => {
      expect(payment.month).toBe(index + 1);
      expect(payment.principal).toBeGreaterThan(0);
      expect(payment.interest).toBeGreaterThan(0);
      expect(payment.total).toBeGreaterThan(0);
      expect(payment.remaining_balance).toBeGreaterThanOrEqual(0);
    });

    // First payment should have highest interest, lowest principal
    const firstPayment = result.payment_schedule[0];
    const lastPayment = result.payment_schedule[5];
    
    expect(firstPayment.interest).toBeGreaterThan(lastPayment.interest);
    expect(firstPayment.principal).toBeLessThan(lastPayment.principal);
    
    // Last payment should have zero remaining balance
    expect(lastPayment.remaining_balance).toBe(0);
  });

  it('should handle balance reduction correctly', async () => {
    const result = await calculateLoanSimulation(50000, 10, 3);

    let expectedBalance = 50000;
    
    for (let i = 0; i < result.payment_schedule.length - 1; i++) {
      const payment = result.payment_schedule[i];
      expectedBalance -= payment.principal;
      
      // Allow small rounding differences
      expect(payment.remaining_balance).toBeCloseTo(expectedBalance, 2);
    }

    // Final balance should be exactly zero
    expect(result.payment_schedule[2].remaining_balance).toBe(0);
  });

  it('should calculate different loan amounts correctly', async () => {
    const smallLoan = await calculateLoanSimulation(10000, 8, 12);
    const largeLoan = await calculateLoanSimulation(100000, 8, 12);

    // Larger loan should have proportionally larger payments
    expect(largeLoan.monthly_payment).toBeCloseTo(smallLoan.monthly_payment * 10, 1);
    expect(largeLoan.total_payment).toBeCloseTo(smallLoan.total_payment * 10, 1);
    expect(largeLoan.total_interest).toBeCloseTo(smallLoan.total_interest * 10, 1);
  });

  it('should handle single month loan', async () => {
    const result = await calculateLoanSimulation(5000, 12, 1);

    expect(result.payment_schedule).toHaveLength(1);
    expect(result.payment_schedule[0].month).toBe(1);
    expect(result.payment_schedule[0].remaining_balance).toBe(0);
    
    // With 1 month term, most of payment should be principal
    expect(result.payment_schedule[0].principal).toBeCloseTo(5000, 1);
    expect(result.payment_schedule[0].interest).toBe(5000 * (12/100/12)); // 1 month interest
  });
});
