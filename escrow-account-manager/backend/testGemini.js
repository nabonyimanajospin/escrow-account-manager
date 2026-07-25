require('dotenv').config();
const { generateChatResponse } = require('./src/services/aiService');

async function run() {
  try {
    console.log('Testing Gemini API key:', process.env.GEMINI_API_KEY);
    const context = {
      propTitle: 'General Platform Query',
      price: 0,
      status: 'N/A',
      role: 'GUEST',
      contractAddress: 'N/A'
    };
    const res = await generateChatResponse("Tell me, I have logged in as buyer but I do not know where to start so that I can buy", context);
    console.log("Success:", res);
  } catch (err) {
    console.error("Failed:", err);
  }
}

run();
