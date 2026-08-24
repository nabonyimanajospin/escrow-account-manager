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

function isBroadSelection(selectedText, paragraphText = '') {
  const sel = selectedText.trim();
  if (sel.length >= 280) return true;
  if (paragraphText && sel.length / Math.max(paragraphText.length, 1) >= 0.75) return true;
  const clauseHits = (sel.match(/clause\s*[1-4]/gi) || []).length;
  return clauseHits >= 2;
}

function buildFullContractExplanation(ctx = {}) {
  const role = ctx.userRole || 'Participant';
  const status = ctx.status || 'PENDING';
  const roleIntro =
    role === 'BUYER'
      ? `As **${ctx.userName || 'the buyer'}**, this agreement defines what you are purchasing, what you will pay, and how your money is protected until title transfer is verified.`
      : role === 'SELLER'
        ? `As **${ctx.userName || 'the seller'}**, this agreement defines what you must deliver, when you get paid, and how disputes are handled before funds reach your wallet.`
        : `This agreement governs how **${ctx.buyerName}** and **${ctx.sellerName}** complete the sale of **"${ctx.propertyTitle}"**.`;

  return `${roleIntro}

**Clause 1 — Parties & property:** **${ctx.buyerName}** (buyer) and **${ctx.sellerName}** (seller) agree on **"${ctx.propertyTitle}"** at **${ctx.propertyLocation}** (UPI **${ctx.upiCode || 'N/A'}**) for **${fmtMoney(ctx.amount)}**. This sets who is legally bound and which asset is being transferred.

**Clause 2 — Escrow custody & fees:** The buyer deposits **${fmtMoney(ctx.totalBuyerPaid)}** total (**${fmtMoney(ctx.amount)}** + **${fmtMoney(ctx.buyerFee)}** buyer fee). Funds stay locked in escrow until mutation documents and registry checks succeed. On this deal the status is **${status}**${status === 'FUNDED' || status === 'MUTATION_STARTED' || status === 'UNDER_REVIEW' ? ' — buyer funds are already in custody' : status === 'PENDING' ? ' — deposit happens after both parties verify OTP' : ''}.

**Clause 3 — Seller payout & disputes:** After admin approval, the seller receives **${fmtMoney(ctx.sellerNetPayout)}** net (after **${fmtMoney(ctx.sellerFee)}** seller fee). If fraud, title defects, or disputes arise, funds remain frozen and either party may escalate to admin mediation.

**Clause 4 — Cryptographic consensus:** Both parties authorize key steps via OTP on EscrowTrust. Buyer authorized: **${ctx.buyerAuthorized ? 'Yes' : 'No'}**. Seller authorized: **${ctx.sellerAuthorized ? 'Yes' : 'No'}**. These digital approvals create an auditable record alongside this contract.

**What you should understand before signing:** EscrowTrust does not ask you to skip reading — it holds money safely while **${ctx.sellerName}** proves title transfer and admin verifies the registry. Your role (${role}) has clear steps at each status; signing means you agree to this structured process, not that you waive your dispute or refund protections.`;
}

function buildClauseExplanation(clause, ctx = {}) {
  const role = ctx.userRole || 'Participant';
  const status = ctx.status || 'PENDING';

  if (clause === 1) {
    return `This clause names the parties and the property being sold. **${ctx.buyerName}** is the buyer and **${ctx.sellerName}** is the seller. They agree to transfer **"${ctx.propertyTitle}"** located at **${ctx.propertyLocation}** for **${fmtMoney(ctx.amount)}**.

**How it works:** This is the foundation of the contract — it confirms who is involved, which listing is covered, and the purchase price before escrow steps begin.

**What ${role === 'BUYER' ? 'you' : 'the buyer'} should know:** ${role === 'BUYER' ? `You are committing to buy this specific property at the stated price. Your total wallet deposit will be **${fmtMoney(ctx.totalBuyerPaid)}** including fees, but payment only moves into escrow after OTP verification (status: **${status}**).` : `The buyer **${ctx.buyerName}** is identified as the purchaser of your listing at **${fmtMoney(ctx.amount)}**.`}

**What ${role === 'SELLER' ? 'you' : 'the seller'} should know:** ${role === 'SELLER' ? `You agree to transfer legal title of this property once escrow conditions are met. Your net payout after the seller fee will be **${fmtMoney(ctx.sellerNetPayout)}** upon successful completion.` : `The seller **${ctx.sellerName}** must deliver title and mutation documents for this property.`}`;
  }

  if (clause === 2) {
    return `This clause explains how buyer funds are held in escrow. The buyer pays **${fmtMoney(ctx.totalBuyerPaid)}** (**${fmtMoney(ctx.amount)}** + **${fmtMoney(ctx.buyerFee)}** platform fee) into the EscrowTrust vault. Money stays locked until the seller completes title mutation and administration verifies registry clearance.

**How it works:** Neither party can unilaterally withdraw escrow funds. The buyer cannot get a casual refund without the dispute/admin process; the seller cannot receive payout until release rules are satisfied.

**On this deal (${ctx.transactionId}, status ${status}):** ${status === 'PENDING' ? 'Funds are not yet deposited — complete OTP verification first, then deposit from wallet.' : status === 'FUNDED' || status === 'MUTATION_STARTED' || status === 'UNDER_REVIEW' ? `Funds (**${fmtMoney(ctx.totalBuyerPaid)}**) are in escrow custody now.` : 'Follow the escrow workspace timeline for the current funding state.'}

**For you as ${role}:** ${role === 'BUYER' ? 'Your money is protected in escrow while the seller proves transfer — you are not paying directly to the seller’s personal account.' : role === 'SELLER' ? 'You will not receive payout until documents and admin review are complete, which protects both sides.' : 'Monitor custody status and admin review checkpoints.'}`;
  }

  if (clause === 3) {
    return `This clause covers seller payout and dispute protection. After verification, **${ctx.sellerName}** receives **${fmtMoney(ctx.sellerNetPayout)}** net (purchase price minus **${fmtMoney(ctx.sellerFee)}** seller fee). If document forgery, title defects, or disputes appear, funds stay frozen for mediation.

**How it works:** Payout is not instant when the buyer deposits. Admin must approve release after mutation documents and registry checks. Either party can file a dispute to pause release.

**What you should know:** This protects the buyer from paying for a bad title and protects the seller from unfair chargebacks by requiring evidence and admin review.

**For you as ${role}:** ${role === 'BUYER' ? 'You may file a dispute if documents do not match the listing or UPI. Funds remain frozen until resolved.' : role === 'SELLER' ? `Your net payout of **${fmtMoney(ctx.sellerNetPayout)}** is earned only after successful mutation and admin release.` : 'Admin mediates disputes and decides release or refund.'}`;
  }

  if (clause === 4) {
    return `This clause confirms that OTP approvals logged on EscrowTrust are legally binding authorization steps under Rwandan law and smart-contract escrow standards.

**How it works:** Buyer and seller each verify OTP codes sent to notifications, email, and SMS. These approvals create cryptographic signatures on the deal timeline.

**On this deal:** Buyer authorized **${ctx.buyerAuthorized ? 'Yes' : 'No'}** · Seller authorized **${ctx.sellerAuthorized ? 'Yes' : 'No'}**.

**For you as ${role}:** ${role === 'BUYER' || role === 'SELLER' ? 'Verify OTP only when you understand and agree with the current escrow step — it is your digital sign-off, not a trap, but a record that you approved that stage.' : 'Both parties must authorize before sensitive steps proceed.'}`;
  }

  return '';
}

/**
 * Guaranteed substantive explanation — always returns helpful content.
 */
function buildRichExplanation(selectedText, paragraphText, ctx = {}) {
  const sel = selectedText.trim();
  const paragraph = paragraphText || sel;
  const broad = isBroadSelection(sel, paragraph);

  if (broad) {
    return buildFullContractExplanation(ctx);
  }

  const clause = detectClauseNumber(ctx.clauseLabel, paragraph);
  const clauseBody = buildClauseExplanation(clause, ctx);
  if (clauseBody) {
    const focus =
      sel.length < 120
        ? `**Regarding your highlighted words** ("${sel}"): this appears in ${ctx.clauseLabel || `Clause ${clause}`}.`
        : `**Regarding your selection** in ${ctx.clauseLabel || `Clause ${clause}`}:`;

    return `${focus}

${clauseBody}`;
  }

  return buildSelectionSpecificFallback(selectedText, paragraph, ctx);
}

function stripExplanationMeta(text = '') {
  return String(text)
    .replace(/^#{1,6}\s*🧠[^\n]*\n+/i, '')
    .replace(/^\*\*Your selection:\*\*[^\n]*\n+/i, '')
    .replace(/^-\s*\*\*What these exact words mean:\*\*\s*\n?/i, '')
    .trim();
}

function sanitizeMarkdownForDisplay(text = '') {
  let out = String(text).trim();
  const boldCount = (out.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) out += '**';
  return out;
}

function isTruncatedExplanation(text = '') {
  const cleaned = stripExplanationMeta(text);
  if (!cleaned || cleaned.length < 40) return true;

  const boldCount = (cleaned.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) return true;

  const tail = cleaned.slice(-100).trim();
  const endsCleanly = /[.!?]["')\]]*\s*$/.test(tail) || /[.!?]["')\]]*\s*$/.test(cleaned.trim());
  if (!endsCleanly) return true;

  return false;
}

function isSubstantiveExplanation(text = '') {
  const cleaned = stripExplanationMeta(text);
  if (cleaned.length < 120) return false;
  if (isTruncatedExplanation(cleaned)) return false;
  const lower = cleaned.toLowerCase();
  const hasMeaning =
    lower.includes('how it works') ||
    lower.includes('means') ||
    lower.includes('escrow') ||
    lower.includes('buyer') ||
    lower.includes('seller') ||
    lower.includes('deposit') ||
    lower.includes('payout') ||
    lower.includes('clause') ||
    lower.includes('should know');
  return hasMeaning;
}

function mergeExplanation(aiText, fallbackText) {
  const fallback = sanitizeMarkdownForDisplay(stripExplanationMeta(fallbackText) || fallbackText);
  const ai = stripExplanationMeta(aiText);

  if (!ai || isTruncatedExplanation(ai) || !isSubstantiveExplanation(ai)) {
    return fallback;
  }

  return sanitizeMarkdownForDisplay(ai);
}

/**
 * Keyword-driven focus instructions tied to THIS deal's real data.
 */
function buildSelectionFocusInstructions(selectedText, paragraphText, ctx = {}) {
  const sel = selectedText.toLowerCase();
  const lines = [];
  const clause = detectClauseNumber(ctx.clauseLabel, paragraphText);
  const broad = isBroadSelection(selectedText, paragraphText);

  if (broad) {
    lines.push('The user selected a large portion or multiple clauses. Explain ALL FOUR contract clauses in plain professional language.');
    lines.push(`Structure: (1) Parties & property, (2) Escrow custody & fees, (3) Seller payout & disputes, (4) Cryptographic consensus.`);
    lines.push(`Use real names and amounts. End with what ${ctx.userRole} should understand before signing — reassuring, not discouraging.`);
    lines.push('Do NOT merely repeat the selected text. Teach what will actually occur step by step.');
    return lines.join('\n');
  }

  lines.push(`Explain the FULL paragraph for ${ctx.userName || 'the reader'} as ${ctx.userRole}, using the highlighted phrase "${selectedText}" as the entry point.`);
  lines.push('Include: what it means, how it works on EscrowTrust, what the user should know, and what happens next on THIS deal.');
  lines.push('Tone: professional, clear, reassuring — educate without discouraging signing.');

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

  lines.push('FORBIDDEN: Do NOT only repeat the selected text. Do NOT return empty bullet points.');
  lines.push('REQUIRED: Minimum 4 sentences of real explanation tied to this deal.');

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
  buildRichExplanation,
  buildFullContractExplanation,
  isBroadSelection,
  mergeExplanation,
  stripExplanationMeta,
  isSubstantiveExplanation,
  isTruncatedExplanation,
  sanitizeMarkdownForDisplay,
  detectClauseNumber,
};
