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
  const systemKnowledge = getEscrowTrustSystemKnowledge();
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
    return buildSelectionSpecificFallback(selectedText, fullParagraph, contractContext);
  }

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 700,
      },
    });

    const prompt = `${AI_INSTRUCTIONS}

${systemKnowledge}

${dealContext}

═══ SELECTION-SPECIFIC TASK (HIGHEST PRIORITY — NOT GENERIC) ═══
${selectionFocus}

Parent paragraph (for context only — center answer on the HIGHLIGHTED phrase):
${clauseLabel ? `[${clauseLabel}]\n` : ''}${fullParagraph}

═══ OUTPUT RULES ═══
1. FIRST sentence MUST quote "${selectedText}" and explain those exact words.
2. Use real names: Buyer "${buyerName}", Seller "${sellerName}", Property "${propertyTitle}".
3. Use real amounts from this deal when money/terms appear in the selection.
4. Tie to status "${status}" — what applies NOW, not a generic lifecycle essay.
5. "What this means for you as ${userRole}" must address ONLY the selected phrase's impact on ${userRole}.
6. Do NOT start with "EscrowTrust is a platform..." or list all workflow steps.

Format (Markdown):
### 🧠 AI Legal Co-Pilot
**Your selection:** "${selectedText}"

- **What these exact words mean:** (specific — quote key terms back)
- **In this deal (${transactionId}, ${status}):** (apply to live numbers/names)
- **For you as ${userRole}:** (personal, actionable)
- **Next action related to this phrase:** (one concrete step)

Max 200 words. Zero generic filler.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return buildSelectionSpecificFallback(selectedText, fullParagraph, contractContext);
  }
};

