const verifyEscrowDeposit = async ({ transaction, amount, reference }) => {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  if (process.env.NODE_ENV === 'production' && provider === 'mock') {
    throw new Error('Real payment provider is not configured');
  }

  const expectedAmount = Number(transaction.amount) + Number(transaction.buyerFee || 0);
  const paidAmount = Number(amount);

  if (!reference) {
    return { verified: false, message: 'Payment reference is required' };
  }

  if (Number(paidAmount.toFixed(2)) !== Number(expectedAmount.toFixed(2))) {
    return { verified: false, message: `Deposit amount must be exactly $${expectedAmount.toLocaleString()}` };
  }

  return {
    verified: true,
    provider,
    providerReference: reference,
    amount: paidAmount,
    verifiedAt: new Date(),
  };
};

module.exports = {
  verifyEscrowDeposit,
};
