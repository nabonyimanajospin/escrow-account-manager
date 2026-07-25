const sendConsensusCode = async ({ user, transaction, code, expiresAt }) => {
  const hasProvider =
    process.env.NOTIFICATION_PROVIDER &&
    process.env.NOTIFICATION_PROVIDER !== 'console';

  if (process.env.NODE_ENV === 'production' && !hasProvider) {
    throw new Error('Secure notification provider is not configured');
  }

  if (!hasProvider) {
    console.info(`[CONSENSUS_OTP] user=${user.email || user.id} transaction=${transaction.transactionId} code=${code} expiresAt=${expiresAt.toISOString()}`);
    return { provider: 'console', delivered: true };
  }

  // Adapter seam: plug SMS/email provider here.
  return { provider: process.env.NOTIFICATION_PROVIDER, delivered: true };
};

module.exports = {
  sendConsensusCode,
};
