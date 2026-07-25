const { Transaction, Property, User, Escrow } = require('../models');
const registryService = require('../services/registryService');

// Contextual rules matching query terms to return highly detailed responses
const getAIResponse = async (message, transaction, role) => {
  const query = message.toLowerCase();
  const status = transaction.status;
  const propTitle = transaction.property?.title || 'the property';
  const price = parseFloat(transaction.amount);

  if (query.includes('fee') || query.includes('charge') || query.includes('split') || query.includes('cost')) {
    const buyerFee = (price * 0.010).toFixed(2);
    const sellerFee = (price * 0.015).toFixed(2);
    const sellerPayout = (price - sellerFee).toFixed(2);
    const buyerTotal = (price + parseFloat(buyerFee)).toFixed(2);
    return `### 💸 Platform Fee & Split Breakdown
The platform charges a total **2.5% service fee** which is split between the buyer and seller.
- **Buyer Fee (1.0%)**: $${parseFloat(buyerFee).toLocaleString()} (charged upfront during funding)
- **Total Required from Buyer**: $${parseFloat(buyerTotal).toLocaleString()}
- **Seller Fee (1.5%)**: $${parseFloat(sellerFee).toLocaleString()} (deducted upon completion)
- **Net Payout to Seller**: $${parseFloat(sellerPayout).toLocaleString()}

*Note: Seller fees are only deducted when the Administrator formally releases the funds.*`;
  }

  // 2. Dispute Inquiry
  if (query.includes('dispute') || query.includes('complain') || query.includes('fraud') || query.includes('problem') || query.includes('stuck')) {
    if (status === 'DISPUTED') {
      return `### ⚠️ Dispute Under Mediation
This transaction is currently in **DISPUTED** status.
- **What this means**: The escrow funds are fully locked and frozen. No release or refunds can occur automatically.
- **What you should do**: Ensure you have uploaded all necessary evidence (e.g. proof of payment, messages, or land certificate draft). The Administrator will review the logs and files, act as the arbitrator, and rule on a **Settle Release** or **Refund**.`;
    }
    return `### ⚖️ Dispute Resolution Process
If there is a conflict or if the other party is uncooperative:
1. Click the **"File Dispute"** button in your transaction workspace.
2. This will freeze the escrow account status to **DISPUTED**.
3. An administrator will step in as a neutral mediator to review evidence.
4. Once resolved, the arbitrator can issue a refund to the buyer or release the net payout to the seller.`;
  }

  // 3. AI Document Analysis
  if (query.includes('analyze') || query.includes('check') || query.includes('verify') || query.includes('report') || query.includes('review')) {
    if (!transaction.mutationDocuments || transaction.mutationDocuments.length === 0) {
      return `### 🤖 AI Document Analysis
No documents have been uploaded yet. Please upload a draft deed of transfer first so I can analyze its structure and verify it against registry expectations.`;
    }

    const primaryDoc = transaction.mutationDocuments[0];
    let docText = "";
    if (primaryDoc.documentUrl.startsWith('data:')) {
      try {
        const base64Parts = primaryDoc.documentUrl.split(',');
        const base64Content = base64Parts[1];
        docText = Buffer.from(base64Content, 'base64').toString('utf8');
      } catch (err) {
        docText = "";
      }
    } else {
      docText = primaryDoc.documentUrl;
    }

    // Fetching from registryService instead of hardcoded data

    const combinedContent = (docText + " " + primaryDoc.description).toUpperCase();
    const hasDeedType = combinedContent.includes('DEED') || combinedContent.includes('MUTATION') || combinedContent.includes('TRANSFER');
    const hasSeller = combinedContent.includes(transaction.seller.name.toUpperCase());
    const hasBuyer = combinedContent.includes(transaction.buyer.name.toUpperCase());
    const hasProperty = combinedContent.includes(transaction.property.title.toUpperCase()) || combinedContent.includes(`PROPERTY ID: ${transaction.propertyId}`) || combinedContent.includes(`PROP-${transaction.propertyId}`);
    
    const upiRegex = /\d{1,2}\/\d{2}\/\d{2}\/\d{2}\/\d{1,5}/;
    const upiMatch = combinedContent.match(upiRegex);
    const matchedUpi = upiMatch ? upiMatch[0].toUpperCase() : null;

    let upiExists = false;
    let ownerMatches = false;
    let parcelClean = false;

    if (matchedUpi) {
      const record = await registryService.lookupParcel(matchedUpi);
      if (record) {
        upiExists = true;
        if (record.owner.toUpperCase() === transaction.seller.name.toUpperCase()) {
          ownerMatches = true;
        }
        if (record.status === 'CLEAN') {
          parcelClean = true;
        }
      }
    }

    return `### 🤖 AI Co-Pilot Document Analysis
I have analyzed your uploaded document (\`${primaryDoc.description}\`) in real-time. Here are my findings:

1. **Document Type**: ${hasDeedType ? '✅ Verified' : '❌ Missing (Expected "Deed", "Mutation", or "Transfer" keywords)'}
2. **Seller Identity**: ${hasSeller ? '✅ Match' : `❌ Mismatch (Expected: "${transaction.seller.name}")`}
3. **Buyer Identity**: ${hasBuyer ? '✅ Match' : `❌ Mismatch (Expected: "${transaction.buyer.name}")`}
4. **Property Alignment**: ${hasProperty ? '✅ Verified' : `❌ Mismatch (Expected: "${transaction.property.title}")`}
5. **UPI Parcel Code**: ${matchedUpi ? `✅ Verified (\`${matchedUpi}\`)` : '❌ Missing UPI format'}
6. **Government Registry**: ${upiExists ? '✅ Parcel Record Found' : '❌ Parcel Record Not Found in public land records'}
7. **Legal Ownership**: ${ownerMatches ? `✅ Registered to Seller (${transaction.seller.name})` : '❌ Warning: Legal ownership mismatches current seller'}
8. **Parcel Encumbrances**: ${parcelClean ? '✅ Clean for transfer' : '❌ Warning: Registry reports caveats/mortgages on parcel'}

**AI Verdict**:
${hasDeedType && hasSeller && hasBuyer && hasProperty && matchedUpi && upiExists && ownerMatches && parcelClean 
  ? `🟢 **Ready for Automated Registry Sync!** Your document details are verified and matched against real public land records. You can proceed with the registry bypass button.`
  : `🔴 **Action Required**: The document details mismatch the registry records. Make sure the land parcel UPI is registered in public records and belongs to the seller Alice Ishimwe.`
}`;
  }

  // 4. Document or Mutation analysis
  if (query.includes('deed') || query.includes('document') || query.includes('proof') || query.includes('mutation') || query.includes('upload')) {
    const docCount = transaction.mutationDocuments?.length || 0;
    if (role === 'SELLER') {
      if (status === 'FUNDED') {
        return `### 📄 Mutation Process (Seller Steps)
The buyer has fully funded the escrow account. You should now:
1. Click **"Initiate Mutation"** to start the deed transfer process.
2. Upload the necessary transfer certificates or title deeds using the **"Upload Document"** button.
3. Submit the transaction for review.`;
      }
      return `### 📁 Documents Status
You have uploaded **${docCount} document(s)**. Ensure they show clear ownership mutation from you to the buyer. Once uploaded, verify the consensus codes to submit for final review.`;
    } else {
      return `### 🔍 Document Inspection (Buyer Steps)
The seller is responsible for uploading the ownership mutation certificates.
- **Currently Uploaded**: ${docCount} document(s).
- Once the seller completes uploads, you should inspect them. If they look correct, submit your **consensus code** to authorize the admin review.`;
    }
  }

  // 4. Next Step / Help
  if (query.includes('next') || query.includes('help') || query.includes('what to do') || query.includes('todo') || query.includes('status')) {
    switch (status) {
      case 'PENDING':
        return `### ⏳ Current Step: Deposit Funds
The transaction is in **PENDING** status.
- **Next Action**:
  - **Buyer**: Submit the consensus code then proceed to the **"Simulate Deposit"** button to lock the funds.
  - **Seller**: Submit the consensus code to signal agreement.
- **Time Limit**: You have 10 minutes to fund this transaction before it automatically expires and unlocks the listing.`;
      case 'FUNDED':
        return `### 💰 Current Step: Initiate Mutation
The buyer has successfully deposited $${price.toLocaleString()} into the escrow address \`${transaction.escrowAccount?.contractAddress || '0x...'}\`.
- **Next Action**:
  - **Seller**: Enter your consensus code to verify state, then click **"Start Mutation Process"**.
  - **Buyer**: Await the seller's upload of the mutation deed transfer drafts.`;
      case 'MUTATION_STARTED':
        return `### 🔨 Current Step: Upload Deed Proofs
Ownership transfer (mutation) has been initiated.
- **Next Action**:
  - **Seller**: Upload your deed mutation documents, submit consensus code, and click **"Complete Mutation"**.
  - **Buyer**: Verify the uploaded documents and enter your consensus code to proceed to review.`;
      case 'UNDER_REVIEW':
        return `### 🔍 Current Step: Admin Verification
The deed transfer has been completed and submitted for official audit.
- **Next Action**:
  - **Administrator**: Inspect the uploaded deeds and click **"Release Funds"** to complete the deal or **"Refund Buyer"** if documentation is invalid.
  - **Buyer/Seller**: Await review completion. Funds remain locked in escrow.`;
      case 'DISPUTED':
        return `### 🔒 Current Step: Mediation
The deal is frozen due to an active dispute.
- **Next Action**:
  - **Buyer/Seller**: Discuss terms or upload additional supporting files.
  - **Administrator**: Review the audit log signature chain and issue a final settlement or refund.`;
      case 'COMPLETED':
        return `### 🎉 Deal Completed!
The transaction has successfully closed.
- **Result**: Funds net of the 2.5% platform fee have been released to the seller, and property ownership is transferred.
- **Receipt**: You can now download or print your official **Deed of Sale & Settlement Agreement** using the print button.`;
      case 'REFUNDED':
        return `### ↩️ Transaction Voided / Refunded
The transaction has been cancelled or rejected.
- **Result**: Any deposited funds have been returned to the buyer, and the property listing \`${propTitle}\` is back on the market.`;
      default:
        return `The current transaction status is **${status}**. Please let me know what specific step you need guidance with!`;
    }
  }

  // Generic prompt helper
  return `### 👋 Hello! I am your AI Escrow Co-Pilot.
I am analyzing your **Escrow Transaction (ID: ${transaction.transactionId})** for the property **${propTitle}**.

You can ask me questions like:
- *"What is my next step?"*
- *"How do platform fees work?"*
- *"How do I raise a dispute?"*
- *"Tell me about the legal document requirements."*

**Transaction Details**:
- **Property Price**: $${price.toLocaleString()}
- **Simulated Contract Address**: \`${transaction.escrowAccount?.contractAddress || '0x...'}\`
- **Current Status**: **${status}**
- **Your Role**: **${role}**`;
};

const { generateChatResponse } = require('../services/aiService');

// @desc    Chat with contextual AI Co-Pilot
// @route   POST /api/escrow/:id/ai-chat
// @access  Private
exports.chatWithAI = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message query is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Property, as: 'property' },
        { model: Escrow, as: 'escrowAccount' },
        { model: User, as: 'buyer', attributes: ['id', 'name'] },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant =
      transaction.buyerId === req.user.id ||
      transaction.sellerId === req.user.id ||
      req.user.role === 'ADMIN';

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized to chat about this transaction' });
    }

    let responseText;
    try {
      // Try Gemini AI first
      const context = {
        propTitle: transaction.property?.title || 'the property',
        price: parseFloat(transaction.amount),
        status: transaction.status,
        role: req.user.role,
        contractAddress: transaction.escrowAccount?.contractAddress || 'Not Generated'
      };
      responseText = await generateChatResponse(message, context);
    } catch (aiError) {
      // Fallback to hardcoded rules if Gemini fails or key is missing
      console.warn('Gemini AI chat failed or key missing, falling back to rule-based engine.');
      responseText = await getAIResponse(message, transaction, req.user.role);
    }

    res.status(200).json({
      success: true,
      response: responseText,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Global chat with contextual AI Co-Pilot
// @route   POST /api/ai/global-chat
// @access  Public or Private
exports.chatWithGlobalAI = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message query is required' });
    }

    let responseText;
    try {
      // Try Gemini AI first
      const context = {
        propTitle: 'General Platform Query',
        price: 0,
        status: 'N/A',
        role: req.user ? req.user.role : 'GUEST',
        contractAddress: 'N/A'
      };
      responseText = await generateChatResponse(message, context);
    } catch (aiError) {
      // Fallback
      console.warn('Gemini AI global chat failed or key missing.');
      
      const query = message.toLowerCase();
      if (query.includes('fee') || query.includes('charge')) {
        responseText = `### 💸 Platform Fees\nThe platform charges a total **2.5% service fee** per transaction. The buyer pays **1.0%** upfront upon funding the escrow, and the seller pays **1.5%** which is deducted from their final payout.`;
      } else if (query.includes('dispute') || query.includes('problem')) {
        responseText = `### ⚖️ Disputes\nIf there is a conflict, you can file a dispute in your transaction workspace. An administrator will review evidence as a neutral mediator.`;
      } else {
        responseText = `Hello! I am your AI Assistant. I can help you understand how escrow transactions work, explain platform fees, or guide you through filing a dispute. How can I help?`;
      }
    }

    res.status(200).json({
      success: true,
      response: responseText,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};
