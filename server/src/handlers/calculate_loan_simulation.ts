
interface LoanSimulation {
    monthly_payment: number;
    total_payment: number;
    total_interest: number;
    payment_schedule: Array<{
        month: number;
        principal: number;
        interest: number;
        total: number;
        remaining_balance: number;
    }>;
}

export async function calculateLoanSimulation(
    amount: number,
    interestRate: number,
    termMonths: number
): Promise<LoanSimulation> {
    // Convert annual interest rate to monthly rate
    const monthlyRate = interestRate / 100 / 12;
    
    // Calculate monthly payment using standard loan formula
    // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPayment: number;
    
    if (monthlyRate === 0) {
        // If no interest, payment is simply amount divided by term
        monthlyPayment = amount / termMonths;
    } else {
        const factor = Math.pow(1 + monthlyRate, termMonths);
        monthlyPayment = amount * (monthlyRate * factor) / (factor - 1);
    }
    
    // Generate payment schedule
    const paymentSchedule = [];
    let remainingBalance = amount;
    
    for (let month = 1; month <= termMonths; month++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        
        // Adjust final payment to handle rounding differences
        if (month === termMonths) {
            const adjustedPrincipal = remainingBalance;
            const adjustedTotal = adjustedPrincipal + interestPayment;
            
            paymentSchedule.push({
                month,
                principal: adjustedPrincipal,
                interest: interestPayment,
                total: adjustedTotal,
                remaining_balance: 0
            });
            
            remainingBalance = 0;
        } else {
            remainingBalance -= principalPayment;
            
            paymentSchedule.push({
                month,
                principal: principalPayment,
                interest: interestPayment,
                total: monthlyPayment,
                remaining_balance: remainingBalance
            });
        }
    }
    
    // Calculate totals
    const totalPayment = paymentSchedule.reduce((sum, payment) => sum + payment.total, 0);
    const totalInterest = totalPayment - amount;
    
    return {
        monthly_payment: monthlyPayment,
        total_payment: totalPayment,
        total_interest: totalInterest,
        payment_schedule: paymentSchedule
    };
}
