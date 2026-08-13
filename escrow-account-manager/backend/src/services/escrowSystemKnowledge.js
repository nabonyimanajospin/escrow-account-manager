/**
 * ESCROWTRUST — Authoritative AI System Knowledge Base
 * Single source of truth for ALL AI prompts (contract explain, chat, dispute).
 * Keep in sync with actual platform behavior in controllers/models.
 */

const TRANSACTION_STATUSES = [
  'PENDING',
  'FUNDED',
  'MUTATION_STARTED',
  'UNDER_REVIEW',
  'DISPUTED',
  'AWAITING_RECEIPT',
  'COMPLETED',
  'REFUNDED',
  'CANCELLED',
];

const STATUS_GUIDE = {
  PENDING: {
    meaning: 'Escrow deal created. Awaiting dual OTP consensus and buyer deposit.',
    buyer: 'Verify OTP consensus code, then deposit property price + 1.0% buyer fee from wallet.',
    seller: 'Verify OTP consensus code to authorize the deal. Wait for buyer deposit.',
    admin: 'Monitor deal. No release action yet.',
  },
  FUNDED: {
    meaning: 'Buyer deposited full amount + 1% fee. Funds locked in escrow vault.',
    buyer: 'Funds are locked safely. Wait for seller to initiate mutation and upload deed documents.',
    seller: 'Initiate mutation process, then upload land title / mutation certificate documents.',
    admin: 'Monitor. Seller should begin deed transfer.',
  },
  MUTATION_STARTED: {
    meaning: 'Seller started ownership mutation. Awaiting deed document uploads.',
    buyer: 'Review will follow once seller uploads and completes mutation submission.',
    seller: 'Upload mutation/deed proof files, complete mutation, submit for review.',
    admin: 'Await seller document submission.',
  },
  UNDER_REVIEW: {
    meaning: 'Documents submitted. Registry verification and admin audit in progress.',
    buyer: 'Confirm property/deed receipt when prompted — this informs admin release checklist.',
    seller: 'Await admin review. Funds remain locked until admin approves release.',
    admin: 'Verify registry report & documents. Release funds to seller OR refund buyer with audit notes.',
  },
  DISPUTED: {
    meaning: 'Deal frozen due to dispute or RED fraud triage. No automatic release/refund.',
    buyer: 'Upload dispute evidence. Await admin mediation outcome (refund or release).',
    seller: 'Upload dispute evidence. Await admin mediation outcome.',
    admin: 'Mediate dispute, review evidence chain, rule RELEASE_TO_SELLER or REFUND_TO_BUYER.',
  },
  AWAITING_RECEIPT: {
    meaning: 'Admin released funds. Seller net payout credited to seller wallet.',
    buyer: 'Deal nearing completion. Seller must confirm payout receipt.',
    seller: 'Confirm receipt of net payout (price minus 1.5% seller fee) to finalize.',
    admin: 'Ensure ledger and wallet credit records are correct.',
  },
  COMPLETED: {
    meaning: 'Deal successfully closed. Property transfer and payout finalized.',
    buyer: 'Transaction complete. Contract QR verification shows final VERIFIED certificate.',
    seller: 'Net payout received. Listing marked sold.',
    admin: 'Archive audit trail. Deal closed.',
  },
  REFUNDED: {
    meaning: 'Buyer refunded. Deal voided. Property returns to market.',
    buyer: 'Deposited funds returned to wallet.',
    seller: 'No payout. Property can be relisted.',
    admin: 'Refund recorded in ledger.',
  },
  CANCELLED: {
    meaning: 'Deal cancelled before funding completed.',
    buyer: 'No deposit was completed or deal expired.',
    seller: 'Property listing unlocked for other buyers.',
    admin: 'No financial settlement needed.',
  },
};

/**
 * Complete platform knowledge document injected into every AI prompt.
 */
function getEscrowTrustSystemKnowledge() {
  return `
═══════════════════════════════════════════════════════════════
ESCROWTRUST PLATFORM — COMPLETE AUTHORITATIVE SYSTEM REFERENCE
Jurisdiction: Rwanda (RLMA / UPI land parcels / Irembo ecosystem)
═══════════════════════════════════════════════════════════════

▸ PLATFORM PURPOSE
EscrowTrust is a secure real estate escrow platform. Buyers and sellers never exchange money directly.
Funds sit in an escrow vault until land mutation documents are verified and an administrator approves release.

▸ USER ROLES
• BUYER — Browse listings, place offers/bids, initiate purchase, deposit escrow, confirm deed receipt, raise disputes.
• SELLER — List properties, accept offers, upload mutation/deed documents, receive wallet payout, raise disputes.
• ADMIN — KYC oversight, registry verification, release funds, refund buyer, dispute mediation, audit logs.
• GUEST — Can browse public listings and use global AI chat; must register + KYC for financial actions.

▸ KYC (Know Your Customer)
Identity verification required before buying, selling, or receiving payouts. Admin can review KYC documents.

▸ PROPERTY MARKETPLACE
• Property statuses: AVAILABLE, PENDING (in active deal), SOLD.
• Listing types: FIXED_PRICE (direct purchase) or AUCTION (buyers place offers/bids).
• Public catalog hides properties with active pending bids from other buyers.
• Sellers manage all listings (available, in escrow, sold) from dashboard.

▸ OFFERS & AI BUYER RANKING (Auction listings)
Buyers submit offers with price and payment period days.
AI ranking score = ((OfferPrice / TargetPrice) × 100) − (PaymentPeriodDays × 0.5) + (KYC verified ? 5 : 0).
Sellers see 🏆 Rank #1 Top Pick and can accept the best bid.

▸ PLATFORM FEES (EXACT)
• Buyer fee: 1.0% of property price — paid UPFRONT with escrow deposit.
• Seller fee: 1.5% of property price — deducted from seller payout on completion.
• Total platform revenue: 2.5% per completed deal.
• Example: $100,000 property → Buyer deposits $101,000. Seller receives $98,500 net.

▸ TRANSACTION STATUS STATE MACHINE (EXACT ORDER)
${TRANSACTION_STATUSES.join(' → ')} (with DISPUTED/REFUNDED/CANCELLED as branches)

Status definitions:
${Object.entries(STATUS_GUIDE).map(([s, g]) => `  [${s}]: ${g.meaning}`).join('\n')}

▸ STEP-BY-STEP ESCROW WORKFLOW
1. INITIATE — Buyer starts deal on FIXED_PRICE property OR seller accepts an offer.
   → Transaction created as PENDING. EVM-style escrow contract address generated per deal.
   → Property status becomes PENDING (locked from other buyers).
2. DUAL OTP CONSENSUS — Separate OTP codes sent to buyer AND seller (hashed, expiring).
   → Both must authorize (buyerAuthorized + sellerAuthorized = true) before deposit.
3. DEPOSIT — Buyer pays property price + 1% buyer fee from wallet into escrow vault.
   → Status: FUNDED. Ledger: DEBIT buyer cash, CREDIT escrow custody.
4. MUTATION — Seller initiates mutation → uploads deed/mutation PDF/image documents.
   → Status: MUTATION_STARTED then submission moves toward UNDER_REVIEW.
   → Each upload gets SHA-256 checksum registered; optional on-chain log.
5. AI DOCUMENT TRIAGE (automatic on upload)
   • GREEN — Passes OCR/rules → fast track toward review.
   • YELLOW — Minor issues → seller should fix and re-upload.
   • RED — Fraud/tampering flags → deal may freeze to DISPUTED.
6. REGISTRY VERIFICATION — Cross-checks UPI parcel code, seller/buyer names, deed keywords vs land records.
7. ADMIN REVIEW (UNDER_REVIEW) — Admin inspects documents, registry report, audit notes.
   → Admin RELEASE: escrow debited, seller wallet credited (net of 1.5% fee), platform fee recorded.
   → Status moves to AWAITING_RECEIPT. OR Admin REFUND: buyer wallet credited, status REFUNDED.
8. BUYER CONFIRMATION — During UNDER_REVIEW buyer confirms property/deed receipt (admin checklist input).
9. SELLER CONFIRMATION — At AWAITING_RECEIPT seller confirms payout received → COMPLETED.
10. COMPLETED — Final state. Contract QR certificate shows VERIFIED (not before).

▸ DISPUTE RESOLUTION
• Either party clicks "File Dispute" → status DISPUTED, funds frozen.
• Both upload evidence files. Admin mediates with AI-assisted recommendation.
• Outcomes: RELEASE_TO_SELLER or REFUND_TO_BUYER.

▸ WALLET SYSTEM
• Each user has walletBalance (USD).
• Buyer deposits from wallet into escrow. Seller receives CREDIT on release.
• Seller can request withdrawal from wallet page.
• All wallet movements logged as WalletTransaction records.

▸ DOUBLE-ENTRY ACCOUNTING JOURNAL
Account types: BUYER_CASH, ESCROW_CUSTODY, SELLER_CASH, PLATFORM_REVENUE.
Every deposit, release, refund creates balanced DEBIT/CREDIT ledger entries.
• Per-deal journal: visible inside each escrow workspace.
• Global journal: Dashboard tab shows all user's deals combined (admin sees all).

▸ AUDIT LOG (IMMUTABLE)
Every state change logged with user, action, IP, hash-chained signatures.
Logs cannot be edited or deleted. Admin can verify chain integrity.

▸ CONTRACT PREVIEW & QR VERIFICATION
• In-deal modal shows 4-clause escrow agreement with official/draft stamp.
• Stable checksum: CHK-ESCROW-{transactionId}-{reference} or deed SHA-256 if uploaded.
• QR encodes public URL /verify-contract/{checksum}.
• Verification portal states:
  - IN_PROGRESS — deal exists but NOT final (PENDING through AWAITING_RECEIPT).
  - VERIFIED — only when status = COMPLETED.
  - FROZEN — DISPUTED or fraud triage.
  - INVALID — checksum not found.
• Print/download locked until COMPLETED (anti-fraud).

▸ CONTRACT AI EXPLAINER ("Ask AI")
User highlights text in contract → AI explains FULL paragraph for their role (buyer/seller/admin)
using this system knowledge + live deal snapshot.

▸ AI CHAT CO-PILOT
• Per-deal chat inside EscrowDetail workspace (context-aware to that transaction).
• Global floating widget for general platform questions (guest-friendly).

▸ ADMIN PANEL CAPABILITIES
• View all transactions, mutation documents, KYC submissions.
• Registry verify, release funds (requires admin audit notes), refund buyer.
• Dispute mediation. Demo override paths exist for presentations only.

▸ ABUSE PREVENTIONS
• Buyer active deal limits in production.
• Pending deals auto-expire if unfunded (cron job).
• Rate limiting on auth and OTP endpoints.
• Secured file access (authenticated document viewing).

▸ BLOCKCHAIN / CRYPTO (Platform layer)
• Each deal gets unique escrow contractAddress (EVM-style identifier).
• Document SHA-256 checksums for tamper detection.
• Dual cryptographic consensus signatures on authorization.
• On-chain deployment is simulated in current deployment; checksums and audit chain are real.

▸ WHAT AI MUST NEVER DO
• Never claim a PENDING/FUNDED/UNDER_REVIEW deal is "fully verified" or "registered" — only COMPLETED gets final certificate.
• Never invent fees other than 1.0% buyer + 1.5% seller.
• Never say funds can be released without admin action during active escrow.
• Never reveal JWT secrets, database internals, or raw API paths.
• Never guarantee legal title — platform facilitates escrow; admin verifies documents.

▸ DASHBOARD FEATURES BY ROLE
BUYER: Browse catalog, active deals, wallet balance, global accounting journal, KYC.
SELLER: My properties (all statuses), buyer bids, escrow deals, seller wallet, global journal.
ADMIN: Admin panel, all transactions, release/refund, disputes, audit logs.

═══════════════════════════════════════════════════════════════
END OF SYSTEM REFERENCE — Answer ONLY based on facts above.
═══════════════════════════════════════════════════════════════
`;
}

/**
 * Build live deal context string for AI prompts.
 */
function buildDealContextSnapshot(ctx = {}) {
  const status = ctx.status || 'UNKNOWN';
  const guide = STATUS_GUIDE[status] || {};
  const role = ctx.userRole || ctx.role || 'Participant';

  let roleNextStep = guide.buyer;
  if (role === 'SELLER') roleNextStep = guide.seller;
  if (role === 'ADMIN') roleNextStep = guide.admin;

  return `
── LIVE DEAL CONTEXT (use with system reference above) ──
Transaction ID: ${ctx.transactionId || ctx.transactionRef || 'N/A'} (internal #${ctx.id || 'N/A'})
Status: ${status} — ${guide.meaning || 'See status guide'}
Property: "${ctx.propertyTitle || 'N/A'}" | Location: ${ctx.propertyLocation || ctx.location || 'N/A'}
UPI Code: ${ctx.upiCode || 'N/A'} | Listing type: ${ctx.listingType || 'N/A'}
Price: $${ctx.amount ?? 'N/A'} | Buyer pays total: $${ctx.totalBuyerPaid ?? 'N/A'} (incl. $${ctx.buyerFee ?? '0'} buyer fee)
Seller net on completion: $${ctx.sellerNetPayout ?? 'N/A'} (after $${ctx.sellerFee ?? '0'} seller fee)
Buyer: ${ctx.buyerName || 'N/A'} | OTP authorized: ${ctx.buyerAuthorized ? 'YES' : 'NO'}
Seller: ${ctx.sellerName || 'N/A'} | OTP authorized: ${ctx.sellerAuthorized ? 'YES' : 'NO'}
Escrow contract address: ${ctx.contractAddress || ctx.escrowContractAddress || 'N/A'}
Escrow vault balance: $${ctx.escrowBalance ?? 'N/A'}
Mutation documents uploaded: ${ctx.mutationDocCount ?? 0}
Reader: ${role}${ctx.userName ? ` (${ctx.userName})` : ''}
Next action for ${role}: ${roleNextStep || ctx.currentWorkflowStep || 'Follow escrow workspace timeline'}
── END LIVE DEAL CONTEXT ──
`;
}

/**
 * Build transaction object into context for chat from Sequelize model.
 */
function buildDealContextFromTransaction(transaction, user) {
  if (!transaction) return buildDealContextSnapshot({ userRole: user?.role, userName: user?.name });

  const price = parseFloat(transaction.amount || 0);
  const buyerFee = parseFloat(transaction.buyerFee || price * 0.01);
  const sellerFee = parseFloat(transaction.sellerFee || price * 0.015);

  return buildDealContextSnapshot({
    id: transaction.id,
    transactionId: transaction.transactionId,
    status: transaction.status,
    propertyTitle: transaction.property?.title,
    propertyLocation: transaction.property?.location,
    upiCode: transaction.property?.upiCode,
    listingType: transaction.property?.listingType,
    amount: price,
    buyerFee,
    sellerFee,
    totalBuyerPaid: price + buyerFee,
    sellerNetPayout: price - sellerFee,
    buyerName: transaction.buyer?.name,
    sellerName: transaction.seller?.name,
    buyerAuthorized: transaction.buyerAuthorized,
    sellerAuthorized: transaction.sellerAuthorized,
    contractAddress: transaction.escrowAccount?.contractAddress,
    escrowBalance: transaction.escrowAccount?.balance,
    mutationDocCount: transaction.mutationDocuments?.length || 0,
    userRole: user?.role,
    userName: user?.name,
  });
}

const AI_INSTRUCTIONS = `
You are EscrowTrust AI Co-Pilot. You have memorized the COMPLETE system reference above.
Rules:
1. Answer with 100% accuracy — only state facts from the system reference and live deal context.
2. Tailor every answer to the user's role (BUYER / SELLER / ADMIN / GUEST).
3. For "next step" questions, use the exact status and role-specific actions from the reference.
4. Use Markdown: headings, bullets, bold for clarity.
5. If unsure, say what the user should check on their dashboard — do not guess.
6. Never claim final land registration until status is COMPLETED.
`;

module.exports = {
  TRANSACTION_STATUSES,
  STATUS_GUIDE,
  getEscrowTrustSystemKnowledge,
  buildDealContextSnapshot,
  buildDealContextFromTransaction,
  AI_INSTRUCTIONS,
};
