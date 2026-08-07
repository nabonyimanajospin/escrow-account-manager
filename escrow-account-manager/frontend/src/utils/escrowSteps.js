export const getEscrowNextStep = (transaction, user) => {
  if (!transaction || !user) return null;

  const status = transaction.status;
  const isBuyer = user.id === transaction.buyerId;
  const isSeller = user.id === transaction.sellerId;
  const isAdmin = user.role === 'ADMIN';
  const depositTotal = Number(transaction.amount || 0) + Number(transaction.buyerFee || 0);

  const steps = {
    PENDING: isBuyer
      ? {
          title: 'Sign consensus & deposit funds',
          detail: transaction.buyerAuthorized && transaction.sellerAuthorized
            ? `Deposit $${depositTotal.toLocaleString()} from your wallet to lock this deal.`
            : 'Both parties must verify the OTP code from notifications before deposit.',
          tone: 'amber',
        }
      : {
          title: 'Awaiting buyer deposit',
          detail: 'Verify your OTP code if you have not signed yet. Buyer must fund escrow before mutation.',
          tone: 'blue',
        },
    FUNDED: isSeller
      ? { title: 'Start property mutation', detail: 'Begin the legal ownership transfer and upload deed documents.', tone: 'blue' }
      : { title: 'Seller will start mutation', detail: 'Funds are locked. Waiting for seller to initiate the transfer process.', tone: 'slate' },
    MUTATION_STARTED: isSeller
      ? { title: 'Upload mutation proof', detail: 'Upload deed documents and submit for admin review.', tone: 'blue' }
      : { title: 'Mutation in progress', detail: 'Seller is completing the ownership transfer. You will be notified.', tone: 'slate' },
    UNDER_REVIEW: isAdmin
      ? { title: 'Admin: review & release', detail: 'Verify registry report, then release funds or refund if needed.', tone: 'purple' }
      : isBuyer
      ? { title: 'Confirm deed receipt', detail: 'Confirm you received the property deed so admin can release funds.', tone: 'amber' }
      : { title: 'Under admin review', detail: 'Documents are being verified. Payout follows admin approval.', tone: 'slate' },
    AWAITING_RECEIPT: isSeller
      ? { title: 'Confirm payout received', detail: 'Confirm you received the net payout to finalize the deal.', tone: 'emerald' }
      : { title: 'Awaiting seller confirmation', detail: 'Funds released. Seller must confirm receipt to complete.', tone: 'slate' },
    DISPUTED: { title: 'Dispute under mediation', detail: 'Escrow is frozen. Admin will resolve in favor of buyer or seller.', tone: 'red' },
    COMPLETED: { title: 'Deal completed', detail: 'This escrow transaction has been successfully finalized.', tone: 'emerald' },
    REFUNDED: { title: 'Buyer refunded', detail: 'Escrow funds were returned to the buyer.', tone: 'slate' },
    CANCELLED: { title: 'Deal cancelled', detail: 'This transaction was cancelled before completion.', tone: 'slate' },
  };

  return steps[status] || null;
};

export const toneClasses = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  red: 'bg-red-50 border-red-200 text-red-900',
};
