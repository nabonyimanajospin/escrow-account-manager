/**
 * Builds selection-specific analysis so AI answers the EXACT highlighted phrase,
 * not a generic escrow overview.
 */
function fmtMoney(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function detectClauseNumber(clauseLabel = '', paragraphText = '') {
  const src = `${clauseLabel} ${paragraphText}`.toUpperCase();
  if (src.includes('CLAUSE 1') || src.includes('PARTIES')) return 1;
  if (src.includes('CLAUSE 2') || src.includes('ESCROW CUSTODY') || src.includes('FEES')) return 2;
  if (src.includes('CLAUSE 3') || src.includes('PAYOUT') || src.includes('DISPUTE')) return 3;
  if (src.includes('CLAUSE 4') || src.includes('CRYPTOGRAPHIC') || src.includes('CONSENSUS')) return 4;
  return null;
}

/**
 * Keyword-driven focus instructions tied to THIS deal's real data.
 */
function buildSelectionFocusInstructions(selectedText, paragraphText, ctx = {}) {
  const sel = selectedText.toLowerCase();
  const lines = [];
  const clause = detectClauseNumber(ctx.clauseLabel, paragraphText);

  lines.push(`MANDATORY: Open your answer by quoting these exact words: "${selectedText}"`);
  lines.push(`Then explain ONLY what those specific words mean in THIS contract for ${ctx.userName || 'the reader'} as ${ctx.userRole}.`);

  if (clause === 1) {
    lines.push(`This is Clause 1 about parties: Buyer "${ctx.buyerName}" and Seller "${ctx.sellerName}" buying "${ctx.propertyTitle}" at ${ctx.propertyLocation} for ${fmtMoney(ctx.amount)}.`);
  }
  if (clause === 2) {
    lines.push(`This is Clause 2 about escrow custody: Buyer must deposit ${fmtMoney(ctx.totalBuyerPaid)} total (${fmtMoney(ctx.amount)} price + ${fmtMoney(ctx.buyerFee)} buyer fee). Current deal status: ${ctx.status}.`);
  }
  if (clause === 3) {
    lines.push(`This is Clause 3 about payout/disputes: Seller net payout on completion is ${fmtMoney(ctx.sellerNetPayout)} after ${fmtMoney(ctx.sellerFee)} seller fee.`);
  }
  if (clause === 4) {
    lines.push(`This is Clause 4 about cryptographic consensus: Buyer OTP authorized=${ctx.buyerAuthorized ? 'YES' : 'NO'}, Seller OTP authorized=${ctx.sellerAuthorized ? 'YES' : 'NO'}.`);
  }

  if (/\b(deposit|fund|pay|fee|charge|usd|\$)\b/.test(sel)) {
    lines.push(`Selection mentions money — state EXACT amounts: buyer pays ${fmtMoney(ctx.totalBuyerPaid)}, seller receives ${fmtMoney(ctx.sellerNetPayout)} net, NOT generic "a fee".`);
  }
  if (/\b(lock|custody|vault|escrow)\b/.test(sel)) {
    lines.push(`Selection mentions locked funds — explain whether THIS deal (status ${ctx.status}) has funds locked NOW and who cannot withdraw (buyer cannot get refund unilaterally; seller cannot take money until admin release).`);
  }
  if (/\b(mutation|deed|title|transfer|registry|document)\b/.test(sel)) {
    lines.push(`Selection mentions documents — seller "${ctx.sellerName}" must upload mutation proof; ${ctx.mutationDocCount || 0} document(s) uploaded so far on this deal.`);
  }
  if (/\b(dispute|fraud|defect|mediation|refund|frozen)\b/.test(sel)) {
    lines.push(`Selection mentions dispute/refund — explain File Dispute button, DISPUTED status freezing funds, admin mediation for THIS transaction ${ctx.transactionId}.`);
  }
  if (/\b(consensus|signature|authorize|binding|otp|cryptograph)\b/.test(sel)) {
    lines.push(`Selection mentions signatures/consensus — reference dual OTP: buyer authorized=${ctx.buyerAuthorized ? 'YES' : 'NO'}, seller authorized=${ctx.sellerAuthorized ? 'YES' : 'NO'} on deal ${ctx.transactionId}.`);
  }
  if (/\b(buyer|purchaser)\b/.test(sel) && ctx.userRole === 'BUYER') {
    lines.push(`Reader IS the buyer "${ctx.userName}" — use "you" when describing buyer obligations in the selected phrase.`);
  }
  if (/\b(seller|vendor)\b/.test(sel) && ctx.userRole === 'SELLER') {
    lines.push(`Reader IS the seller "${ctx.userName}" — use "you" when describing seller obligations in the selected phrase.`);
  }
  if (/\b(admin|administr|verif|review|release)\b/.test(sel)) {
    lines.push(`Selection mentions admin — at UNDER_REVIEW admin "${ctx.userRole === 'ADMIN' ? ctx.userName : 'platform administrator'}" verifies registry and releases or refunds.`);
  }
  if (/\b(property|listing|upi|location)\b/.test(sel)) {
    lines.push(`Property specifics: "${ctx.propertyTitle}", UPI ${ctx.upiCode || 'N/A'}, location ${ctx.propertyLocation}.`);
  }

  lines.push('FORBIDDEN: Do NOT give a generic platform tour. Do NOT repeat all 10 workflow steps unless the selection explicitly asks "how does the whole process work".');
  lines.push('REQUIRED: Every sentence must connect back to the meaning of the highlighted words or their immediate sentence in the paragraph.');

  return lines.join('\n');
}

/**
 * Rule-based specific fallback when Gemini is unavailable — still tied to selection.
 */
function buildSelectionSpecificFallback(selectedText, paragraphText, ctx = {}) {
  const sel = selectedText.toLowerCase();
  const role = ctx.userRole || 'Participant';
  const status = ctx.status || 'IN PROGRESS';
  const you = ctx.userName ? `${ctx.userName} (${role})` : role;
  const clause = detectClauseNumber(ctx.clauseLabel, paragraphText);

  let specific = '';

  if (/\b(deposit|fund|pay).*\b(fee|charge)\b/.test(sel) || (sel.includes('deposit') && clause === 2)) {
    specific = `The words you selected require **${ctx.buyerName}** to deposit **${fmtMoney(ctx.totalBuyerPaid)}** into escrow — that is **${fmtMoney(ctx.amount)}** for "${ctx.propertyTitle}" plus the **1.0% buyer fee (${fmtMoney(ctx.buyerFee)})**. Right now this deal is **${status}**, so ${status === 'PENDING' ? 'you have not deposited yet; complete OTP consensus first, then deposit from your wallet' : status === 'FUNDED' ? 'these funds are already locked in the escrow vault' : 'check the escrow timeline for whether deposit has occurred'}.`;
  } else if (sel.includes('locked') || sel.includes('custody') || sel.includes('vault')) {
    specific = `"Locked in custody" means neither party can move the money alone. For deal **${ctx.transactionId}**, status **${status}**, funds ${status === 'FUNDED' || status === 'MUTATION_STARTED' || status === 'UNDER_REVIEW' ? `are held in escrow until admin approves release to **${ctx.sellerName}** or a refund to **${ctx.buyerName}**` : status === 'PENDING' ? 'will be locked only after you deposit' : 'follow the current timeline — see escrow workspace'}.`;
  } else if (sel.includes('payout') || sel.includes('net') || (sel.includes('seller') && sel.includes('receive'))) {
    specific = `Your selection refers to the seller receiving **${fmtMoney(ctx.sellerNetPayout)}** net (**${fmtMoney(ctx.amount)}** minus **1.5% seller fee ${fmtMoney(ctx.sellerFee)}**). This happens only after admin release when status reaches completion — not before mutation documents are verified.`;
  } else if (sel.includes('dispute') || sel.includes('forgery') || sel.includes('frozen') || sel.includes('mediation')) {
    specific = `This phrase means if deed fraud or a defect appears on **"${ctx.propertyTitle}"**, the **${fmtMoney(ctx.amount)}** in escrow stays frozen. Either party can file a dispute → status **DISPUTED** → admin mediates for **${ctx.buyerName}** vs **${ctx.sellerName}**.`;
  } else if (sel.includes('consensus') || sel.includes('signature') || sel.includes('binding')) {
    specific = `This means both **${ctx.buyerName}** and **${ctx.sellerName}** must authorize via OTP on EscrowTrust. Currently: buyer authorized **${ctx.buyerAuthorized ? 'YES' : 'NO'}**, seller authorized **${ctx.sellerAuthorized ? 'YES' : 'NO'}**. Without both, deposit cannot proceed safely.`;
  } else if (sel.includes('transfer') || sel.includes('title') || sel.includes('mutation')) {
    specific = `This obligates **${ctx.sellerName}** to transfer title of **"${ctx.propertyTitle}"** (UPI **${ctx.upiCode || 'N/A'}**) to **${ctx.buyerName}**. Seller uploads mutation documents (${ctx.mutationDocCount || 0} uploaded); admin verifies before any payout.`;
  } else if (clause === 1 || sel.includes('parties') || sel.includes('agreement')) {
    specific = `This identifies the parties: **${ctx.buyerName}** (buyer) and **${ctx.sellerName}** (seller) for property **"${ctx.propertyTitle}"** at **${ctx.propertyLocation}** for **${fmtMoney(ctx.amount)}**, dated per this contract on transaction **${ctx.transactionId}**.`;
  } else {
    // Sentence-level: take the sentence containing the selection from paragraph
    const sentences = paragraphText.split(/(?<=[.!?])\s+/);
    const matched = sentences.find((s) => s.toLowerCase().includes(sel.slice(0, Math.min(20, sel.length)))) || selectedText;
    specific = `In the sentence: _"${matched.trim()}"_ — as **${you}**, read this as part of **${ctx.clauseLabel || 'this clause'}** on deal **${ctx.transactionId}** (status **${status}**). It binds **${ctx.buyerName}** and **${ctx.sellerName}** over **"${ctx.propertyTitle}"** worth **${fmtMoney(ctx.amount)}**.`;
  }

  const guide = role === 'SELLER'
    ? (status === 'FUNDED' ? 'Your next step: start mutation and upload deed documents.' : status === 'PENDING' ? 'Your next step: verify your OTP consensus code.' : 'Check escrow timeline for your current seller action.')
    : role === 'BUYER'
      ? (status === 'PENDING' ? 'Your next step: verify OTP, then deposit from wallet.' : status === 'UNDER_REVIEW' ? 'Your next step: confirm deed receipt when ready.' : 'Check escrow timeline for your current buyer action.')
      : 'Review admin checklist if you are overseeing this deal.';

  return `### 🧠 AI Legal Co-Pilot
**You selected:** _"${selectedText}"_
**From:** ${ctx.clauseLabel || 'Contract paragraph'}

**Specific meaning of your selection:**
${specific}

**What this means for you as ${role}:**
${guide}

**How EscrowTrust applies to these exact words:**
Funds (${fmtMoney(ctx.totalBuyerPaid)} max from buyer) stay in escrow vault until documents, registry checks, dual OTP, and admin release — not generic policy, but the rule governing the phrase you highlighted.`;
}

module.exports = {
  buildSelectionFocusInstructions,
  buildSelectionSpecificFallback,
  detectClauseNumber,
};
