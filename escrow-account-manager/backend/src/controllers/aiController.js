const { Transaction, Property, User, Escrow } = require('../models');
const registryService = require('../services/registryService');
const logger = require('../utils/logger');

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
      const record = await registryService.lookupParcel(matchedUpi, transaction.seller.name);
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

  // Contract / agreement inquiry
  if (query.includes('contract') || query.includes('agreement') || query.includes('certificate') || query.includes('pdf') || query.includes('qr') || query.includes('checksum')) {
    const propTitle = transaction.property?.title || 'the property';
    const buyerFee = (price * 0.010).toFixed(2);
    const sellerFee = (price * 0.015).toFixed(2);
    return `### 📜 How Your Escrow Contract Works (This Deal)

**For transaction \`${transaction.transactionId}\`** on **${propTitle}**:

1. **Created when the deal started** — EscrowTrust generated a unique escrow contract address: \`${transaction.escrowAccount?.contractAddress || 'pending'}\`.
2. **4-clause live agreement** — Open **Contract Preview** in your escrow workspace. Clauses cover parties, escrow custody & fees, seller payout/disputes, and cryptographic consensus — filled with your real names, price ($${price.toLocaleString()}), and fees (buyer 1% = $${parseFloat(buyerFee).toLocaleString()}, seller 1.5% = $${parseFloat(sellerFee).toLocaleString()}).
3. **Current status: ${status}** — ${status === 'COMPLETED' ? 'This deal is **final**. The contract shows **VERIFIED** and PDF download/print is unlocked.' : 'The contract is still a **DRAFT / IN PROGRESS** certificate — not final until COMPLETED.'}
4. **QR & checksum** — Scan the QR on the contract to verify authenticity at the public portal.
5. **Official PDF** — Generated automatically when admin releases funds / deal completes.

**Tip:** Highlight any clause in Contract Preview → **Ask AI to Explain** for help specific to your role (${role}).`;
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

  // 4. Flow/Process Inquiry
  if (query.includes('flow') || query.includes('process') || query.includes('how it works') || query.includes('how does')) {
    return `### 🔄 Transaction Flow
The escrow process ensures safety for both parties:
1. **Fund**: The Buyer deposits the money into Escrow (plus a 1% platform fee).
2. **Transfer**: The Seller uploads the official deed transfer document (Mutation Document).
3. **Verification**: A platform Administrator verifies the documents against the Land Registry.
4. **Release**: Once verified, the Admin releases the funds to the Seller (minus a 1.5% fee), completing the transaction safely!

*Note: If there are any issues, either party can file a dispute for the Admin to mediate.*`;
  }

  // 5. Next Step / Help
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
  - **Seller**: Upload your deed mutation documents, submit your consensus code, and click **"Complete Mutation"**.
  - **Buyer**: Await the seller's document uploads. You will be notified when they are ready for review.`;
      case 'UNDER_REVIEW':
        return `### 🔍 Current Step: Admin Verification
The deed transfer has been completed and submitted for official audit.
- **Next Action**:
  - **Buyer**: Confirm receipt of the property deed using the **"Confirm Property Receipt"** button.
  - **Administrator**: Inspect the uploaded deeds and click **"Release Funds"** to complete the deal or **"Refund Buyer"** if documentation is invalid.
  - **Seller**: Await review completion. Funds remain locked in escrow.`;
      case 'DISPUTED':
        return `### 🔒 Current Step: Mediation
The deal is frozen due to an active dispute.
- **Next Action**:
  - **Buyer/Seller**: Upload additional supporting evidence files.
  - **Administrator**: Review the audit log signature chain and issue a final settlement or refund.`;
      case 'AWAITING_RECEIPT':
        return `### 📬 Current Step: Awaiting Seller Confirmation
Funds have been released by the Admin and are now in the seller's wallet.
- **Next Action**:
  - **Seller**: Click **"Confirm Receipt of Funds"** to officially close the transaction.`;
      case 'COMPLETED':
        return `### 🎉 Deal Completed!
The transaction has successfully closed.
- **Result**: Funds net of the 1.5% seller fee have been released to the seller, and property ownership is transferred.
- **Buyer Fee**: A 1.0% platform security charge was collected at deposit.`;
      case 'REFUNDED':
        return `### ↩️ Transaction Voided / Refunded
The transaction has been cancelled or rejected.
- **Result**: Any deposited funds have been returned to the buyer's wallet, and the property listing \`${propTitle}\` is back on the market.`;
      case 'CANCELLED':
        return `### ❌ Transaction Cancelled
This transaction was cancelled before funding was completed.
- **Result**: The property listing \`${propTitle}\` is back on the market.`;
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
      const context = {
        transaction,
        propTitle: transaction.property?.title || 'the property',
        price: parseFloat(transaction.amount),
        status: transaction.status,
        role: req.user.role,
        userName: req.user.name,
        contractAddress: transaction.escrowAccount?.contractAddress || 'Not Generated',
      };
      responseText = await generateChatResponse(message, context);
    } catch (aiError) {
      // Fallback to hardcoded rules if Gemini fails or key is missing
      logger.warn('Gemini AI chat failed, falling back to rule-based engine.');
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

/** Rule-based global chat when Gemini is unavailable — natural replies, no echo loops */
const getGlobalChatFallback = (message) => {
  const q = message.toLowerCase().trim();

  if (/how (are you|you doing|is it going)|how're you|how r u/.test(q)) {
    return `I'm doing well, thanks for asking! I'm here and ready to help with **EscrowTrust** — property buying, escrow fees, or how a deal works. What would you like to know?`;
  }

  if (/how old|your age|when were you born/.test(q)) {
    return `I'm **EscrowTrust's AI assistant** — software, not a person — so I don't have an age. I was built to help you understand buying, selling, and escrow on this platform. What can I help you with?`;
  }

  if (/who are you|what are you|what('s| is) your name|your name/.test(q)) {
    return `I'm the **EscrowTrust AI Co-Pilot** — EscrowTrust's built-in AI assistant (software, not a human). I help with listings, escrow deposits, fees (1% buyer + 1.5% seller), contracts, deed verification, and disputes. What would you like to know?`;
  }

  if (/are you (a )?human|are you real|real person|are you (a )?(bot|ai|robot)|artificial intelligence/.test(q)) {
    return `No — I'm **not human**. I'm the **EscrowTrust AI Co-Pilot**, an automated assistant built into this platform to explain buying, selling, escrow, and contracts. Ask me anything about how EscrowTrust works.`;
  }

  if (/thank|thanks|appreciate/.test(q)) {
    return `You're welcome! If you have another question about a property, escrow step, or platform fee, just ask.`;
  }

  if (/good|helpful|worth|trust|recommend|safe|legit|reliable/.test(q) && /system|platform|escrowtrust|this|app|service/.test(q)) {
    return `**Yes — EscrowTrust is designed to be helpful** for property deals where buyers and sellers don't fully trust each other yet.

**What it does well:**
- Locks buyer funds in escrow until deed/mutation is verified
- Transparent fees: buyer pays listing price **+ 1%**; seller receives listing price **− 1.5%**
- Admin review, dispute mediation, and contract verification (QR/checksum)
- Notifications by email, in-app, and SMS when your phone is on your profile

**Honest note:** Deals still need seller document upload and admin verification — it's secure, not instant magic.

Want help with buying, selling, or fees specifically?`;
  }

  if (q.includes('ready') || q.includes('are you ready') || (q.includes('help') && (q.includes('yes') || q.includes('can you')))) {
    return `**YES!** I am fully ready to assist you.

As your **EscrowTrust AI Co-Pilot**, I can guide you with:
- **Buying & Bidding** on properties
- **Escrow protection** and how funds stay locked
- **Fee structure** (1% buyer + 1.5% seller)
- **Disputes & mediation**

What would you like to explore first?`;
  }

  if (q.includes('fee') || q.includes('charge') || q.includes('cost') || q.includes('percent')) {
    return `### Platform Fee Breakdown
EscrowTrust charges a transparent **2.5% total service fee**:
- **Buyer Fee (1.0%)**: Paid upfront when funding the escrow.
- **Seller Fee (1.5%)**: Deducted from the seller's final payout upon successful completion.

*No hidden costs.*`;
  }

  if (q.includes('dispute') || q.includes('problem') || q.includes('complain') || q.includes('stuck') || q.includes('fraud')) {
    return `### Dispute Resolution
1. Click **File Dispute** in your transaction dashboard to freeze escrow funds.
2. Both parties submit evidence.
3. An administrator reviews and orders a **refund** or **release**.`;
  }

  if (q.includes('buy') || q.includes('purchase') || q.includes('browse')) {
    return `### How to Buy
1. Browse listings → buy now or place a bid
2. Verify OTP consensus → deposit into escrow (+ 1% buyer fee)
3. Seller completes mutation → admin verifies → deal completes`;
  }

  if (q.includes('sell') || q.includes('list') || q.includes('seller')) {
    return `### How to Sell
1. Add a property from your dashboard
2. Review buyer offers (AI-ranked)
3. Accept a bid → upload mutation documents → receive net payout (− 1.5% fee)`;
  }

  if (q.includes('rank') || q.includes('ranking') || q.includes('bid') || q.includes('offer')) {
    return `### AI Buyer Ranking
Offers are scored by price vs listing, settlement days, and KYC status. Sellers see **Rank #1 Top Pick** on the property page and can accept the best bid from there.`;
  }

  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('greetings')) {
    return `Hello! I'm your **EscrowTrust AI Co-Pilot**. Ask me about listings, escrow protection, bids, or platform fees — how can I help?`;
  }

  if (q.includes('flow') || q.includes('process') || q.includes('how it works') || q.includes('escrow')) {
    return `### How EscrowTrust Works
1. Agreement (buy or accepted bid)
2. Buyer deposits funds (+ 1% fee)
3. Seller uploads mutation/deed documents
4. Admin verifies registry records
5. Seller receives net payout (− 1.5% fee)`;
  }

  if (
    /contract|agreement|certificate|checksum|qr code|pdf/.test(q) ||
    (/(how|what|when|where|made|create|generat|build)/.test(q) && /contract|agreement/.test(q))
  ) {
    return `### How EscrowTrust Contracts Are Made

1. **Deal initiation** — When a buyer starts a purchase (or a seller accepts a bid), EscrowTrust creates the transaction and assigns a unique **escrow contract address** for that deal.

2. **Digital agreement (4 clauses)** — In the escrow workspace, open **Contract Preview**. The platform auto-builds a live agreement from deal data:
   - **Clause 1** — Buyer, seller, property, UPI code
   - **Clause 2** — Escrow custody, listing price, **1% buyer fee**
   - **Clause 3** — Seller net payout (**1.5% seller fee** deducted), dispute rules
   - **Clause 4** — Dual OTP consensus and audit trail

3. **Draft vs final** — Before the deal is **COMPLETED**, the contract is marked **IN PROGRESS** (draft). It is not a final certificate yet.

4. **Security** — Each contract gets a **SHA-256 checksum** and **QR code**. Anyone can scan it to verify status at the public verification page.

5. **Official PDF** — When the admin **releases funds** and the deal completes, the system auto-generates a **PDF completion certificate** with a text-based official seal.

6. **Download/print** — Locked until **COMPLETED** (prevents fake draft documents).

7. **Ask AI on clauses** — Inside Contract Preview, highlight text and click **Ask AI to Explain** for role-specific help.

Open any active deal → **Contract Preview** to see yours.`;
  }

  return `I can help with **buying**, **selling**, **escrow fees**, **contracts**, **disputes**, and **how a deal moves step by step** on EscrowTrust. What would you like to know?`;
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
      const context = {
        propTitle: 'General Platform Query',
        price: 0,
        status: 'N/A',
        role: req.user ? req.user.role : 'GUEST',
        userName: req.user?.name,
        contractAddress: 'N/A',
      };
      responseText = await generateChatResponse(message, context);
    } catch (aiError) {
      logger.warn('Gemini AI global chat fallback active:', aiError.message);
      responseText = getGlobalChatFallback(message);
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

const { generateDisputeResolution } = require('../services/aiService');
const { Dispute, DisputeEvidence } = require('../models');
const { transactionIncludes } = require('../utils/transactionHelpers');

exports.analyzeDispute = async (req, res, next) => {
  try {
    const { id } = req.params; // Transaction ID
    
    // Fetch transaction
    const transaction = await Transaction.findByPk(id, { include: transactionIncludes });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Fetch dispute
    const dispute = await Dispute.findOne({ where: { transactionId: id, status: 'OPEN' } });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'No open dispute found for this transaction' });
    }

    // Fetch evidence
    const evidenceList = await DisputeEvidence.findAll({ where: { disputeId: dispute.id } });

    // Generate AI resolution
    const analysis = await generateDisputeResolution(transaction, dispute, evidenceList);

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};
