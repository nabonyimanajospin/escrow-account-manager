export const getEscrowNextStep = (transaction, user) => {
  if (!transaction || !user) return null;

  const status = transaction.status;
  const isBuyer = user.id === transaction.buyerId;
  const isSeller = user.id === transaction.sellerId;
  const isAdmin = user.role === 'ADMIN';
  const depositTotal = Number(transaction.amount || 0) + Number(transaction.buyerFee || 0);
  const buyerOk = !!transaction.buyerAuthorized;
  const sellerOk = !!transaction.sellerAuthorized;
  const bothSigned = buyerOk && sellerOk;
  const iNeedOtp = (isBuyer && !buyerOk) || (isSeller && !sellerOk);

  const otpHint =
    'Open the 🔔 notification bell (top right), copy the latest OTP, then enter it in Workspace Actions below to sign.';

  const you = (title, detail, tone = 'amber') => ({
    title,
    detail,
    tone,
    actionKind: 'YOU',
    badge: 'YOUR TURN',
  });

  const wait = (title, detail, tone = 'blue') => ({
    title,
    detail,
    tone,
    actionKind: 'WAIT',
    badge: 'WAITING',
  });

  const steps = {
    PENDING: iNeedOtp
      ? you('Step 1 — Sign with your OTP now', otpHint, 'amber')
      : isBuyer && bothSigned
      ? you(
          'Step 2 — Deposit funds from your wallet',
          `Both parties have signed. Deposit $${depositTotal.toLocaleString()} from your wallet to lock escrow.`,
          'amber'
        )
      : isBuyer
      ? wait(
          'Waiting for the seller to sign OTP',
          'You already signed. Please wait — the seller must verify their OTP from the notification bell before you can deposit.',
          'blue'
        )
      : bothSigned
      ? wait(
          'Waiting for the buyer to deposit',
          'You already signed. Please wait — the buyer must deposit from their wallet to continue.',
          'blue'
        )
      : wait(
          'Waiting for the buyer to sign OTP',
          'You already signed. Please wait — the buyer must still verify OTP from their notification bell.',
          'blue'
        ),

    FUNDED: isSeller
      ? (!sellerOk
          ? you(
              'Step 3 — Verify OTP, then start mutation',
              'Funds are locked. Open 🔔 for your OTP, sign below, then start ownership transfer.',
              'amber'
            )
          : you(
              'Step 3 — Start property mutation',
              'Funds are locked and you are signed. Start ownership transfer and upload deed documents.',
              'blue'
            ))
      : wait(
          'Waiting for the seller to start mutation',
          'Funds are locked in escrow. Please wait while the seller starts the ownership transfer.',
          'slate'
        ),

    MUTATION_STARTED: isSeller
      ? (!sellerOk
          ? you(
              'Step 4 — Verify OTP, then submit for review',
              'Upload mutation documents if needed, open 🔔 for the latest OTP, sign, then submit for admin review.',
              'amber'
            )
          : you(
              'Step 4 — Upload deeds & submit for review',
              'Upload mutation documents, then submit for admin review.',
              'blue'
            ))
      : wait(
          'Waiting for seller mutation documents',
          'Please wait — the seller is completing ownership transfer. You will be notified when admin review starts.',
          'slate'
        ),

    UNDER_REVIEW: isAdmin
      ? you('Admin action — review & release', 'Verify registry report, then release funds or refund if needed.', 'purple')
      : isBuyer
      ? you(
          'Confirm deed receipt when ready',
          'Admin is reviewing documents. When you receive the deed, confirm receipt so funds can be released.',
          'amber'
        )
      : wait(
          'Waiting for admin review',
          'Your documents are under admin verification. Please wait for approval and payout.',
          'slate'
        ),

    AWAITING_RECEIPT: isSeller
      ? you('Confirm payout received', 'Confirm you received the net payout to finalize this deal.', 'emerald')
      : wait(
          'Waiting for seller payout confirmation',
          'Funds were released. Please wait while the seller confirms receipt to complete the deal.',
          'slate'
        ),

    DISPUTED: wait(
      'Dispute under mediation',
      'Escrow is frozen. Please wait — admin will resolve in favor of buyer or seller.',
      'red'
    ),
    COMPLETED: {
      title: 'Deal completed',
      detail: 'This escrow transaction has been successfully finalized. No further action is required.',
      tone: 'emerald',
      actionKind: 'DONE',
      badge: 'DONE',
    },
    REFUNDED: {
      title: 'Buyer refunded',
      detail: 'Escrow funds were returned to the buyer. No further action is required.',
      tone: 'slate',
      actionKind: 'DONE',
      badge: 'DONE',
    },
    CANCELLED: {
      title: 'Deal cancelled',
      detail: 'This transaction was cancelled before completion. No further action is required.',
      tone: 'slate',
      actionKind: 'DONE',
      badge: 'DONE',
    },
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
