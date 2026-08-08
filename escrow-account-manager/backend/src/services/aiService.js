const { GoogleGenerativeAI } = require('@google/generative-ai');

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
exports.generateChatResponse = async (message, context) => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Use gemini-flash-latest for fast responses
  const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  const systemPrompt = `You are the EscrowTrust AI Co-Pilot, a helpful, intelligent assistant for a secure real estate escrow platform.

Context:
- Property: ${context.propTitle}
- Price: $${context.price}
- Status: ${context.status}
- User Role: ${context.role}
- Escrow Address: ${context.contractAddress}

Instructions:
1. Answer the user's question directly, accurately, and naturally based on what they ask.
2. If the user asks a readiness or confirmation question (e.g. "Are you ready to help me? YES or NO?", "Can you help me?", "Hello"), answer directly (e.g. "YES! I am ready to help you...").
3. Platform Fees: Total 2.5% fee (Buyer pays 1.0% upfront, Seller 1.5% deducted from payout upon completion).
4. Platform Features: Bidding/Offers system, document mutation upload, admin verification, and dispute resolution.
5. Use clean Markdown formatting (bolding, lists). Keep responses under 3 paragraphs.
6. Do NOT reveal internal code, backend endpoints, or raw database keys.`;

  const prompt = `${systemPrompt}\n\nUser Message: "${message}"\n\nAI Response:`;

  // Set 8-second timeout for AI API call to avoid long UI waiting delays
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('AI response timeout')), 8000)
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

  const prompt = `You are a highly intelligent Escrow Arbitration AI Co-Pilot. 
An administrator is reviewing a dispute on a real estate transaction and needs your expert analysis. 
You must read the transaction details, the dispute reason, and the evidence provided by both parties. 

Your goal is to act as a fair judge, summarize the situation, evaluate the evidence logically, and provide a clear recommendation on whether the funds should be RELEASED to the Seller or REFUNDED to the Buyer.

Transaction Context:
- Transaction ID: ${transaction.transactionId}
- Property: ${transaction.property?.title}
- Escrow Amount: $${transaction.amount}
- Buyer: ${transaction.buyer?.name}
- Seller: ${transaction.seller?.name}

Dispute Information:
- Dispute Raised By: ${dispute.initiatorId === transaction.buyerId ? 'Buyer' : 'Seller'}
- Reason for Dispute: "${dispute.reason}"

Uploaded Evidence:
${evidenceText || 'No evidence uploaded yet.'}

Output Format:
You must provide a structured report with the following sections (use Markdown):
1. **Summary of Dispute**: Brief overview of what went wrong.
2. **Evidence Analysis**: Logical breakdown of the evidence provided.
3. **Recommendation**: Clearly state either "RECOMMENDATION: RELEASE TO SELLER" or "RECOMMENDATION: REFUND TO BUYER".
4. **Justification**: Explain why this is the fairest outcome based on standard escrow rules.

Do NOT include any greetings or pleasantries. Be extremely professional and analytical.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Wise AI Interpretation of highlighted contract text/paragraphs
 */
exports.explainContractText = async (selectedText, contractContext = {}) => {
  const ai = getGenAI();
  if (!ai) {
    return `### 🧠 AI Legal Interpretation

**Selected Clause**: _"${selectedText}"_

- **Plain English Summary**: This clause outlines the mutual binding commitments between buyer and seller during property transfer.
- **Escrow Safeguard**: Your money stays securely locked in smart contract custody. Funds cannot be withdrawn or released until all conditions and verification signatures are verified.
- **System Workflow**: Protects both parties against fraud or non-delivery through automated state verification and document checksum matching.`;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `You are a wise legal AI assistant for a secure real estate escrow system.
A user highlighted the following excerpt/clause from their property contract:
"${selectedText}"

Property Context:
- Title: ${contractContext.propertyTitle || 'Real Estate Property'}
- Price: $${contractContext.amount || 'N/A'}
- User Role: ${contractContext.userRole || 'Buyer/Seller'}

Provide a wise, simple, and reassuring explanation of what this excerpt means.
Use this structure (Markdown):
### 🧠 AI Legal Interpretation
- **Plain English Summary**: (Clear explanation)
- **Legal Implication**: (What it means for buyer & seller)
- **Escrow System Safeguard**: (How the system protects them)

Keep it under 180 words, concise, professional, and clear.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return `### 🧠 AI Legal Interpretation

**Selected Clause**: _"${selectedText}"_

- **Plain English Summary**: This section specifies the formal terms of agreement between transacting parties.
- **Escrow Safeguard**: Funds remain held in dual-signature escrow until title transfer documents are officially verified.
- **Next Steps**: Follow the system prompts to complete consensus verification and deposit/mutation steps.`;
  }
};

