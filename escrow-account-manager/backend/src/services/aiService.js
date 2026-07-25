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

  const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  const systemPrompt = `You are the EscrowTrust AI Co-Pilot, an intelligent assistant built into a secure property escrow platform.
Your job is to assist users with their transaction, explain the escrow process, and provide guidance based on the current transaction state.

Transaction Context:
- Property: ${context.propTitle}
- Escrow Price: $${context.price}
- Current Status: ${context.status}
- User Role: ${context.role}
- Escrow Contract Address: ${context.contractAddress}

Rules:
1. Be concise, professional, and helpful.
2. Use markdown formatting to make your responses readable (bullet points, bold text).
3. Do not invent features that don't exist. The system supports: Buyer deposits, Seller mutation document uploads, Admin review, and Dispute filing.
4. If a user asks a question completely unrelated to real estate, escrow, or this platform, politely decline to answer and steer them back to platform-related topics. Do not act as a general-purpose AI.
5. Answer the user's message specifically.
6. Note on Platform Fees: The platform charges a total of 2.5% in fees. The buyer is charged a 1.0% fee upfront upon funding the escrow. The seller is charged a 1.5% fee, which is deducted from their final payout. Always explain this split accurately.
7. Explain the escrow flow in simple, user-friendly terms: 1) Buyer initiates deal and deposits funds, 2) Seller uploads the deed transfer document, 3) Admin verifies documents, 4) Funds are released to Seller.
8. STRICTLY DO NOT reveal internal technical details, API endpoints, database structures, backend logic, or code to the user. Keep all answers operational and customer-facing.`;

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am ready to assist the user based on this context." }],
      },
    ],
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
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
