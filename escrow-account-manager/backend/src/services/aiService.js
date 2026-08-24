const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  getEscrowTrustSystemKnowledge,
  buildDealContextSnapshot,
  buildDealContextFromTransaction,
  AI_INSTRUCTIONS,
  STATUS_GUIDE,
} = require('./escrowSystemKnowledge');
const {
  buildSelectionFocusInstructions,
  buildSelectionSpecificFallback,
  buildRichExplanation,
  mergeExplanation,
  isBroadSelection,
} = require('./contractSelectionAnalyzer');

let genAI = null;

const getGenAI = () => {
  if (genAI) return genAI;
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Generate a dynamic chat response using Gemini
 */
exports.generateChatResponse = async (message, context = {}) => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

  const dealContext = context.transaction
    ? buildDealContextFromTransaction(context.transaction, { role: context.role, name: context.userName })
    : buildDealContextSnapshot({
        propertyTitle: context.propTitle,
        amount: context.price,
        status: context.status,
        userRole: context.role,
        contractAddress: context.contractAddress,
        currentWorkflowStep: context.status ? STATUS_GUIDE[context.status]?.meaning : undefined,
      });

  const systemKnowledge = getEscrowTrustSystemKnowledge();

  const prompt = `${AI_INSTRUCTIONS}

${systemKnowledge}

${dealContext}

The user (${context.role || 'GUEST'}${context.userName ? `, ${context.userName}` : ''}) asks:
"${message}"

Respond accurately using ONLY the system reference and live deal context. If this is a general platform question with no active deal, use the full system reference. Keep under 3 short paragraphs unless listing steps. Answer the exact question first — never reply with only a capability list unless the user asks what you can do.`;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI response timeout')), 60000)
  );

  const apiPromise = (async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  })();

  return await Promise.race([apiPromise, timeoutPromise]);
};

/**
 * Generate a property listing description using Gemini
 */
exports.generatePropertyDescription = async (details) => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `Write a highly compelling, professional, and engaging real estate listing description for the following property. 
Do not include any intro or outro text (like "Here is the description:"), just output the description itself. Make it 2-3 paragraphs.

Property Details:
- Title: ${details.title}
- Location: ${details.location}
- Property Type: ${details.propertyType}
- Price: $${details.price}
- Size/Area: ${details.area}
- Bedrooms: ${details.bedrooms || 'N/A'}
- Bathrooms: ${details.bathrooms || 'N/A'}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Generate a dispute resolution recommendation for the Admin using Gemini
 */
exports.generateDisputeResolution = async (transaction, dispute, evidenceList) => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

  const evidenceText = evidenceList.map((e, i) => `Evidence ${i + 1} (Uploaded by ${e.uploaderRole}): "${e.description}" - URL: ${e.documentUrl}`).join('\n');

  const systemKnowledge = getEscrowTrustSystemKnowledge();
  const dealContext = buildDealContextFromTransaction(transaction, { role: 'ADMIN' });

  const prompt = `${AI_INSTRUCTIONS}

${systemKnowledge}

${dealContext}

You are reviewing a DISPUTE as Admin Arbitration AI.

Dispute Raised By: ${dispute.initiatorId === transaction.buyerId ? 'Buyer' : 'Seller'}
Reason: "${dispute.reason}"

Evidence:
${evidenceText || 'No evidence uploaded yet.'}

Output (Markdown):
1. **Summary of Dispute**
2. **Evidence Analysis** (per EscrowTrust dispute rules above)
3. **Recommendation**: "RELEASE TO SELLER" OR "REFUND TO BUYER"
4. **Justification** (cite platform workflow — funds frozen during DISPUTED, admin must mediate)

No greetings. Professional and analytical.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Wise AI Interpretation of highlighted contract text/paragraphs
 * Uses full paragraph context + EscrowTrust platform knowledge for accurate role-based explanations.
 */
exports.explainContractText = async (selectedText, contractContext = {}) => {
  const {
    paragraphText,
    clauseLabel,
    userRole = 'Participant',
    userName,
    propertyTitle,
    propertyLocation,
    upiCode,
    amount,
    buyerFee,
    sellerFee,
    totalBuyerPaid,
    sellerNetPayout,
    status,
    buyerName,
    sellerName,
    transactionId,
    buyerAuthorized,
    sellerAuthorized,
    currentWorkflowStep,
    mutationDocCount,
    escrowBalance,
    contractCreatedDate,
  } = contractContext;

  const fullParagraph = paragraphText || selectedText;
  const selectionFocus = buildSelectionFocusInstructions(selectedText, fullParagraph, contractContext);
  const guaranteedExplanation = buildRichExplanation(selectedText, fullParagraph, contractContext);
  const broad = isBroadSelection(selectedText, fullParagraph);
  const dealContext = buildDealContextSnapshot({
    transactionId,
    status,
    propertyTitle,
    propertyLocation,
    upiCode,
    amount,
    buyerFee,
    sellerFee,
    totalBuyerPaid,
    sellerNetPayout,
    buyerName,
    sellerName,
    buyerAuthorized,
    sellerAuthorized,
    userRole,
    userName,
    currentWorkflowStep,
    mutationDocCount,
    escrowBalance,
  });

  const ai = getGenAI();
  if (!ai) {
    return guaranteedExplanation;
  }

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const compactContractRules = `EscrowTrust rules for this explanation only:
- Buyer deposits price + 1% fee into escrow vault; seller uploads mutation/title docs; admin verifies and releases seller payout (price minus 1.5% seller fee).
- Dual OTP consensus required from buyer and seller before deposit.
- Funds stay locked until registry/admin approval; disputes freeze release.
- Explain clearly for ${userRole}; be professional and reassuring, not discouraging.`;

    const prompt = `${AI_INSTRUCTIONS}

${dealContext}

${compactContractRules}

═══ SELECTION TASK ═══
${selectionFocus}

Paragraph:
${clauseLabel ? `[${clauseLabel}]\n` : ''}${fullParagraph}

Highlighted:
"${selectedText}"

Write a COMPLETE explanation (3–6 short paragraphs). Must end with a full sentence and period.
Sections to cover: What it means · How it works · What ${userRole} should know · What happens next (status: ${status}).
Use names ${buyerName}, ${sellerName}, property "${propertyTitle}", amounts from deal context.
Do NOT include "Your selection:" — UI shows that already.
${broad ? 'Large selection: summarize all four clauses and overall flow.' : 'Explain the full paragraph, starting from the highlight.'}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiText = response.text()?.trim() || '';
    const finishReason = response.candidates?.[0]?.finishReason;

    if (finishReason === 'MAX_TOKENS' || !aiText) {
      return guaranteedExplanation;
    }

    return mergeExplanation(aiText, guaranteedExplanation);
  } catch (err) {
    return guaranteedExplanation;
  }
};

