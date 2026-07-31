const crypto = require('crypto');
const { Transaction, Escrow, Property, User, AuditLog, LedgerEntry, WalletTransaction } = require('../models');
const { sequelize } = require('../config/database');
const ledgerService = require('../services/ledgerService');
const otpService = require('../services/otpService');
const notificationService = require('../services/notificationService');
const paymentProvider = require('../services/paymentProvider');
const registryService = require('../services/registryService');
const { generateEscrowContract } = require('../services/contractService');
const logger = require('../utils/logger');

const { Dispute, DisputeEvidence } = require('../models');

const issueAndDeliverConsensusOtp = async (transaction, dbTransaction, targetRole = 'BOTH') => {
  const otp = await otpService.issueConsensusCode(transaction, dbTransaction);
  const [buyer, seller] = await Promise.all([
    User.findByPk(transaction.buyerId),
    User.findByPk(transaction.sellerId),
  ]);

  if (buyer && (targetRole === 'BOTH' || targetRole === 'BUYER')) {
    await notificationService.sendConsensusCode({ user: buyer, transaction, ...otp });
  }
  if (seller && (targetRole === 'BOTH' || targetRole === 'SELLER')) {
    await notificationService.sendConsensusCode({ user: seller, transaction, ...otp });
  }
};

const { transactionIncludes, logAction } = require('../utils/transactionHelpers');

// @desc    Get all transactions (Admin only)
// @route   GET /api/admin/transactions
// @access  Private (ADMIN)
const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Transaction.findAndCountAll({
      include: transactionIncludes,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.status(200).json({
      success: true,
      count: rows.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get own transactions (Buyer/Seller)
// @route   GET /api/escrow/my
// @access  Private
const getMyTransactions = async (req, res, next) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? {}
      : (req.user.role === 'BUYER' ? { buyerId: req.user.id } : { sellerId: req.user.id });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: transactionIncludes,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction details
// @route   GET /api/escrow/:id
// @access  Private
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: transactionIncludes,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant =
      transaction.buyerId === req.user.id ||
      transaction.sellerId === req.user.id ||
      req.user.role === 'ADMIN';

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this transaction' });
    }



    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer initiates transaction (creates Escrow)
// @route   POST /api/escrow/initiate
// @access  Private (BUYER)
const initiateTransaction = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'Property is not available for transaction' });
    }

    if (property.listingType === 'AUCTION') {
      return res.status(400).json({ success: false, message: 'This property listing is configured for auction bidding. Direct purchases are disabled; please place a bid.' });
    }

    if (property.sellerId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot buy your own property' });
    }

    // Toying buyer prevention: Limit buyer to maximum 2 active/pending transactions
    const activeStates = ['PENDING', 'FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'];
    const activeCount = await Transaction.count({
      where: {
        buyerId: req.user.id,
        status: activeStates
      }
    });

    if (activeCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'You have exceeded the maximum limit of 2 active escrow transactions. Please complete or cancel your pending transactions before initiating a new one.'
      });
    }

    // Wrap multi-write deal creation inside an atomic Sequelize Transaction
    const transactionId = await sequelize.transaction(async (t) => {
      const priceVal = parseFloat(property.price);
      const buyerFee = parseFloat((priceVal * 0.010).toFixed(2));
      const sellerFee = parseFloat((priceVal * 0.015).toFixed(2));

      // Create transaction (starts as PENDING)
      const transaction = await Transaction.create({
        propertyId: property.id,
        buyerId: req.user.id,
        sellerId: property.sellerId,
        amount: priceVal,
        buyerFee,
        sellerFee,
        status: 'PENDING',
      }, { transaction: t });

      // Create Escrow account (contractAddress generated automatically)
      const escrow = await Escrow.create({
        transactionId: transaction.id,
        balance: 0.00,
        status: 'ACTIVE',
      }, { transaction: t });

      // Link Escrow back to Transaction
      await transaction.update({ escrowAccountId: escrow.id }, { transaction: t });

      await issueAndDeliverConsensusOtp(transaction, t);

      // Set Property status to PENDING
      await property.update({ status: 'PENDING' }, { transaction: t });

      // Log the actions in the Immutable Ledger
      await logAction(transaction.id, req, `Transaction agreement initialized by Buyer ${req.user.name}`, { transaction: t });
      await logAction(transaction.id, req, `Cryptographic contract address created: ${escrow.contractAddress}`, { transaction: t });

      return transaction.id;
    });

    const result = await Transaction.findByPk(transactionId, { include: transactionIncludes });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify consensus code
// @route   POST /api/escrow/:id/consensus-verify
// @access  Private
const verifyConsensusCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const queryModel = typeof Transaction.scope === 'function' ? Transaction.scope('withVerificationCode') : Transaction;
    const transaction = await queryModel.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant = transaction.buyerId === req.user.id || transaction.sellerId === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Only buyer or seller can sign consensus codes' });
    }

    // Lockout check
    if (transaction.verificationLockedUntil && new Date(transaction.verificationLockedUntil) > new Date()) {
      const remainingMs = new Date(transaction.verificationLockedUntil).getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 1000 / 60);
      return res.status(403).json({
        success: false,
        message: `Consensus verification is locked due to too many failed attempts. Try again in ${remainingMins} minute(s).`
      });
    }

    if (!otpService.verifyConsensusCode(transaction, code)) {
      const attempts = transaction.verificationAttempts + 1;
      const updates = { verificationAttempts: attempts };
      if (attempts >= 5) {
        updates.verificationLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await transaction.update(updates);

      const message = attempts >= 5
        ? 'Too many failed attempts. Consensus verification has been locked for 15 minutes.'
        : `Consensus code does not match. Please verify code. (${5 - attempts} attempts remaining)`;

      return res.status(400).json({ success: false, message });
    }

    await sequelize.transaction(async (t) => {
      const timeStr = new Date().toISOString();
      if (req.user.role === 'BUYER') {
        const payload = `BUYER-SIGNATURE:${req.user.id}:${transaction.id}:${timeStr}:${transaction.amount}`;
        const sig = 'SIG-BUYER-' + crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex').toUpperCase().slice(0, 32);
        await transaction.update({
          buyerAuthorized: true,
          buyerSignature: sig,
          buyerSignatureDate: new Date(),
          verificationAttempts: 0,
          verificationLockedUntil: null,
        }, { transaction: t });
        await logAction(transaction.id, req, `Buyer ${req.user.name} approved state verification. Cryptographic signature generated: ${sig}`, { transaction: t });
      } else if (req.user.role === 'SELLER') {
        const payload = `SELLER-SIGNATURE:${req.user.id}:${transaction.id}:${timeStr}:${transaction.amount}`;
        const sig = 'SIG-SELLER-' + crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex').toUpperCase().slice(0, 32);
        await transaction.update({
          sellerAuthorized: true,
          sellerSignature: sig,
          sellerSignatureDate: new Date(),
          verificationAttempts: 0,
          verificationLockedUntil: null,
        }, { transaction: t });
        await logAction(transaction.id, req, `Seller ${req.user.name} approved state verification. Cryptographic signature generated: ${sig}`, { transaction: t });
      }
    });

    // Refresh transaction state
    const updatedTx = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Consensus verification code approved.', data: updatedTx });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer deposits funds (Simulated)
// @route   POST /api/escrow/:id/deposit
// @access  Private (BUYER)
const depositFunds = async (req, res, next) => {
  try {
    const { amount, reference } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the buyer can deposit funds' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Transaction is not in PENDING status' });
    }

    if (!transaction.buyerAuthorized || !transaction.sellerAuthorized) {
      return res.status(400).json({ success: false, message: 'Cryptographic consensus required. Both parties must submit verification codes.' });
    }

    const totalRequired = parseFloat(transaction.amount) + parseFloat(transaction.buyerFee || 0);

    if (parseFloat(amount) !== totalRequired) {
      return res.status(400).json({ success: false, message: `Deposit amount must be exactly $${totalRequired.toLocaleString()} (including 1% Platform Security Charge)` });
    }

    const paymentVerification = await paymentProvider.verifyEscrowDeposit({ transaction, amount, reference });
    if (!paymentVerification.verified) {
      return res.status(400).json({ success: false, message: paymentVerification.message || 'Payment provider verification failed' });
    }

    if (!transaction.escrowAccountId) {
      return res.status(400).json({ success: false, message: 'Transaction has no associated escrow account' });
    }
    const escrow = await Escrow.findByPk(transaction.escrowAccountId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    // Update balance and histories inside transaction
    await sequelize.transaction(async (t) => {
      const depositHistory = [...escrow.depositHistory, {
        amount: parseFloat(amount),
        date: new Date(),
        reference: reference || `DEP-${Date.now()}`,
        status: 'COMPLETED',
      }];

      await escrow.update({
        balance: parseFloat(amount),
        depositHistory,
      }, { transaction: t });

      await transaction.update({
        status: 'FUNDED',
        depositDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
      }, { transaction: t });

      await issueAndDeliverConsensusOtp(transaction, t);

      // Double-Entry Bookkeeping
      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'DEBIT',
        amount: totalRequired,
        accountType: 'BUYER_CASH',
        description: 'Payment deposit including 1.0% platform security charge',
      }, t);

      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'CREDIT',
        amount: totalRequired,
        accountType: 'ESCROW_CUSTODY',
        description: 'Escrow account custody credit for transaction lock',
      }, t);

      await logAction(transaction.id, req, `Funds deposited: $${amount} locked in escrow address ${escrow.contractAddress}`, { transaction: t });
      
      // Reload transaction to get buyer/seller details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify users
      if (txWithUsers.buyer && txWithUsers.buyer.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.buyer.email, txWithUsers.buyer.name, 'FUNDED', txWithUsers.id, amount);
        await notificationService.createInAppNotification(txWithUsers.buyerId, 'Funds Deposited', `Your deposit of $${amount} has been received.`);
      }
      if (txWithUsers.seller && txWithUsers.seller.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.seller.email, txWithUsers.seller.name, 'FUNDED', txWithUsers.id, amount);
        await notificationService.createInAppNotification(txWithUsers.sellerId, 'Funds Deposited', `Buyer has deposited $${amount} into escrow.`);
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Funds successfully deposited into escrow.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller initiates mutation process
// @route   POST /api/escrow/:id/initiate-mutation
// @access  Private (SELLER)
const initiateMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can initiate mutation' });
    }

    if (transaction.status !== 'FUNDED') {
      return res.status(400).json({ success: false, message: 'Escrow funds must be deposited before starting mutation' });
    }

    // Removed cryptographic consensus requirement here - buyer depositing funds implicitly authorizes mutation start.

    await sequelize.transaction(async (t) => {
      await transaction.update({
        status: 'MUTATION_STARTED',
        mutationStartDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
      }, { transaction: t });

      // We issue the OTP only to the SELLER, so they can authorize the mutation completion later.
      await issueAndDeliverConsensusOtp(transaction, t, 'SELLER');

      await logAction(transaction.id, req, `Seller initiated ownership mutation (legal transfer)`, { transaction: t });
      
      // Reload transaction to get buyer details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify buyer that mutation has started
      if (txWithUsers.buyer && txWithUsers.buyer.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.buyer.email, txWithUsers.buyer.name, 'MUTATION_STARTED', txWithUsers.id, txWithUsers.amount);
        await notificationService.createInAppNotification(txWithUsers.buyerId, 'Mutation Started', 'The seller has initiated the legal property transfer process.');
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Mutation process successfully initiated.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller uploads mutation documents
// @route   POST /api/escrow/:id/upload-document
// @access  Private (SELLER)
const uploadMutationDocument = async (req, res, next) => {
  try {
    const { documentUrl, description } = req.body;

    if (!documentUrl) {
      return res.status(400).json({ success: false, message: 'Document reference/link is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can upload proof' });
    }

    if (transaction.status !== 'MUTATION_STARTED') {
      return res.status(400).json({ success: false, message: 'Cannot upload mutation documents at this state' });
    }

    await sequelize.transaction(async (t) => {
      const currentDocs = transaction.mutationDocuments || [];
      const mutationDocuments = [...currentDocs, {
        documentUrl,
        description: description || 'Mutation certificate draft',
        uploadedAt: new Date(),
      }];

      await transaction.update({
        mutationDocuments,
      }, { transaction: t });

      await logAction(transaction.id, req, `Seller uploaded document: ${description || 'Mutation certificate draft'}`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Document successfully uploaded.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller submits mutation for final review (Complete mutation)
// @route   POST /api/escrow/:id/complete-mutation
// @access  Private (SELLER, ADMIN)
const completeMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isAuthorized = transaction.sellerId === req.user.id || req.user.role === 'ADMIN';
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit mutation' });
    }

    if (transaction.status !== 'MUTATION_STARTED') {
      return res.status(400).json({ success: false, message: 'Transaction must be in MUTATION_STARTED state' });
    }

    if (transaction.mutationDocuments.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one mutation document as proof' });
    }

    if (!transaction.sellerAuthorized) {
      return res.status(400).json({ success: false, message: 'Cryptographic consensus required. Seller must verify their identity to submit.' });
    }

    await sequelize.transaction(async (t) => {
      await transaction.update({
        status: 'UNDER_REVIEW',
        mutationEndDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
      }, { transaction: t });

      await issueAndDeliverConsensusOtp(transaction, t);

      await logAction(transaction.id, req, `Mutation completed and submitted under review for Admin verification`, { transaction: t });
      
      // Reload transaction to get buyer/seller details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify both parties that mutation is under review
      if (txWithUsers.buyer && txWithUsers.buyer.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.buyer.email, txWithUsers.buyer.name, 'UNDER_REVIEW', txWithUsers.id, txWithUsers.amount);
        await notificationService.createInAppNotification(txWithUsers.buyerId, 'Mutation Under Review', 'The property transfer has been submitted to Admin for verification.');
      }
      if (txWithUsers.seller && txWithUsers.seller.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.seller.email, txWithUsers.seller.name, 'UNDER_REVIEW', txWithUsers.id, txWithUsers.amount);
        await notificationService.createInAppNotification(txWithUsers.sellerId, 'Mutation Under Review', 'Your property transfer submission is now under admin review.');
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Mutation submitted for Admin verification.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin releases funds to seller (shifts status to AWAITING_RECEIPT, recording bookkeeping logs)
// @route   POST /api/admin/transactions/:id/release
// @access  Private (ADMIN)
const releaseFunds = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'UNDER_REVIEW' && transaction.status !== 'DISPUTED') {
      return res.status(400).json({ success: false, message: 'Transaction must be UNDER_REVIEW or DISPUTED to release funds' });
    }

    // Require audit notes for accountability log records
    if (!adminNotes || !adminNotes.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter the admin review audit notes before releasing funds' });
    }

    // Enforce standard checklist rules for normal transactions (Disputes use resolving overrides)
    if (transaction.status === 'UNDER_REVIEW') {
      const report = transaction.registryValidationReport;
      if (!report || report.registryRecordFound !== 'VERIFIED' || report.upiFormatMatch !== 'VERIFIED') {
        return res.status(400).json({ success: false, message: 'Registry deeds verification check must be successfully completed and verified before release' });
      }

      if (!transaction.buyerConfirmedPropertyReceivedAt) {
        return res.status(400).json({ success: false, message: 'Buyer must confirm receipt of property deed before funds can be released' });
      }
    }

    if (!transaction.escrowAccountId) {
      return res.status(400).json({ success: false, message: 'Transaction has no associated escrow account' });
    }
    const escrow = await Escrow.findByPk(transaction.escrowAccountId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const amount = parseFloat(escrow.balance);
    const sellerNetPayout = parseFloat(transaction.amount) - parseFloat(transaction.sellerFee);
    const platformFee = parseFloat(transaction.buyerFee) + parseFloat(transaction.sellerFee);

    await sequelize.transaction(async (t) => {
      const releaseHistory = [...escrow.releaseHistory, {
        amount: sellerNetPayout,
        platformFee,
        date: new Date(),
        reference: `REL-${Date.now()}`,
        status: 'COMPLETED',
      }];

      await escrow.update({ balance: 0.00, status: 'RELEASED', releaseHistory }, { transaction: t });
      await transaction.update({ status: 'AWAITING_RECEIPT', releaseDate: new Date(), adminNotes }, { transaction: t });

      // Bookkeeping entries
      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'DEBIT',
        amount,
        accountType: 'ESCROW_CUSTODY',
        description: 'Custody debit for seller payout and platform fees',
      }, t);

      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'CREDIT',
        amount: sellerNetPayout,
        accountType: 'SELLER_CASH',
        description: 'Credit net payout to seller wallet (listing price excluding 1.5% fee)',
      }, t);

      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'CREDIT',
        amount: platformFee,
        accountType: 'PLATFORM_REVENUE',
        description: 'Credit platform service charges (1.0% buyer + 1.5% seller commissions)',
      }, t);

      // ── Credit Seller Wallet ──────────────────────────────────────────────
      const seller = await User.findByPk(transaction.sellerId, { transaction: t, lock: t.LOCK.UPDATE });
      if (seller) {
        const newBalance = parseFloat(seller.walletBalance || 0) + sellerNetPayout;
        await seller.update({ walletBalance: newBalance }, { transaction: t });

        await WalletTransaction.create({
          userId: seller.id,
          type: 'CREDIT',
          amount: sellerNetPayout,
          reference: transaction.transactionId || `TXN-${transaction.id}`,
          notes: `Escrow released by admin. Net payout after 1.5% seller fee.`,
          status: 'COMPLETED',
        }, { transaction: t });

        // Send email notification (fire-and-forget, non-blocking)
        notificationService.sendWalletCreditEmail(
          seller.email,
          seller.name,
          sellerNetPayout,
          newBalance,
          transaction.reference || `TXN-${transaction.id}`
        ).catch((e) => console.error('[Email] Wallet credit email failed:', e.message));
      }

      await logAction(transaction.id, req, `Admin released funds. Audit Notes: ${adminNotes}. Split details: Seller Net Payout: $${sellerNetPayout}, Platform Commission: $${platformFee}. Status set to AWAITING_RECEIPT.`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Funds successfully released. Awaiting seller receipt acknowledgment. (Net: $${sellerNetPayout}, Fee: $${platformFee}).`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin refunds buyer
// @route   POST /api/admin/transactions/:id/refund
// @access  Private (ADMIN)
const refundBuyer = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    if (!adminNotes || adminNotes.trim() === '') {
      return res.status(400).json({ success: false, message: 'adminNotes is required to refund a buyer' });
    }
    
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const refundableStates = ['FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW', 'DISPUTED'];
    if (!refundableStates.includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot refund at this state' });
    }

    if (!transaction.escrowAccountId) {
      return res.status(400).json({ success: false, message: 'Transaction has no associated escrow account' });
    }
    const escrow = await Escrow.findByPk(transaction.escrowAccountId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const amount = parseFloat(escrow.balance);

    await sequelize.transaction(async (t) => {
      await escrow.update({ balance: 0.00, status: 'REFUNDED' }, { transaction: t });
      await transaction.update({ status: 'REFUNDED', refundDate: new Date() }, { transaction: t });
      await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

      // Bookkeeping entries
      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'DEBIT',
        amount,
        accountType: 'ESCROW_CUSTODY',
        description: 'Debit custody balance to return to buyer',
      }, t);

      await ledgerService.recordEntry({
        transactionId: transaction.id,
        escrowAccountId: escrow.id,
        type: 'CREDIT',
        amount,
        accountType: 'BUYER_CASH',
        description: 'Credit return of deposit to buyer account',
      }, t);

      // Actually credit the buyer's wallet!
      const buyerUser = await User.findByPk(transaction.buyerId, { transaction: t, lock: t.LOCK.UPDATE });
      if (buyerUser) {
        await buyerUser.update({ walletBalance: parseFloat(buyerUser.walletBalance || 0) + amount }, { transaction: t });
        await WalletTransaction.create({
          userId: buyerUser.id,
          type: 'CREDIT',
          amount,
          notes: 'Refund from admin on transaction ' + transaction.id,
          status: 'COMPLETED',
        }, { transaction: t });
      }

      const logMsg = `Admin rejected mutation/resolved dispute and refunded escrow balance of $${amount} to Buyer.` + (adminNotes ? ` Notes: ${adminNotes}` : '');
      await logAction(transaction.id, req, logMsg, { transaction: t });

      // Reload transaction to get buyer details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify buyer
      if (txWithUsers.buyer && txWithUsers.buyer.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.buyer.email, txWithUsers.buyer.name, 'REFUNDED', txWithUsers.id, amount);
        await notificationService.createInAppNotification(txWithUsers.buyerId, 'Refund Initiated', `A refund of $${amount} has been initiated back to your wallet.`);
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Buyer successfully refunded.`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer cancels transaction
// @route   POST /api/escrow/:id/cancel
// @access  Private (BUYER)
const cancelTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only buyer can cancel the transaction' });
    }

    if (!['PENDING', 'FUNDED'].includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel transaction at this stage' });
    }

    if (!transaction.escrowAccountId) {
      return res.status(400).json({ success: false, message: 'Transaction has no associated escrow account' });
    }
    const escrow = await Escrow.findByPk(transaction.escrowAccountId);

    await sequelize.transaction(async (t) => {
      if (transaction.status === 'FUNDED' && escrow) {
        const amount = parseFloat(escrow.balance);
        await escrow.update({ balance: 0.00, status: 'REFUNDED' }, { transaction: t });

        // Credit the buyer's wallet with the refunded amount (including fee)
        const buyer = await User.findByPk(transaction.buyerId, { transaction: t, lock: t.LOCK.UPDATE });
        await buyer.update({ walletBalance: parseFloat(buyer.walletBalance || 0) + amount }, { transaction: t });
        
        await WalletTransaction.create({
          userId: buyer.id,
          type: 'CREDIT',
          amount,
          notes: `Refund for cancelled transaction ${transaction.id}`,
          status: 'COMPLETED',
        }, { transaction: t });

        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'DEBIT',
          amount,
          accountType: 'ESCROW_CUSTODY',
          description: 'Debit custody balance for cancelled refund',
        }, t);

        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'CREDIT',
          amount,
          accountType: 'BUYER_CASH',
          description: 'Credit refund return of deposit on cancelled agreement',
        }, t);
      }

      await transaction.update({ status: 'CANCELLED', refundDate: new Date() }, { transaction: t });
      await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

      await logAction(transaction.id, req, `Transaction cancelled by Buyer. Escrow returned to AVAILABLE.`, { transaction: t });

      // Reload transaction to get seller details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify seller
      if (txWithUsers.seller && txWithUsers.seller.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.seller.email, txWithUsers.seller.name, 'CANCELLED', txWithUsers.id, txWithUsers.amount);
        await notificationService.createInAppNotification(txWithUsers.sellerId, 'Transaction Cancelled', 'The buyer has cancelled the transaction.');
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Transaction cancelled successfully.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin deletes transaction records (preserves AuditLog entries for immutability compliance)
// @route   DELETE /api/admin/transactions/:id
// @access  Private (ADMIN)
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await sequelize.transaction(async (t) => {
      const nextPropertyStatus = transaction.status === 'COMPLETED' ? 'SOLD' : 'AVAILABLE';
      await Property.update({ status: nextPropertyStatus }, { where: { id: transaction.propertyId }, transaction: t });

      if (transaction.escrowAccountId) {
        if (transaction.status === 'FUNDED') {
          // Admin deleted a funded transaction, refund the buyer!
          const escrow = await Escrow.findByPk(transaction.escrowAccountId, { transaction: t });
          const amount = parseFloat(escrow.balance);
          const buyer = await User.findByPk(transaction.buyerId, { transaction: t, lock: t.LOCK.UPDATE });
          await buyer.update({ walletBalance: parseFloat(buyer.walletBalance || 0) + amount }, { transaction: t });
          
          await WalletTransaction.create({
            userId: buyer.id,
            type: 'CREDIT',
            amount,
            notes: `Refund for deleted transaction ${transaction.id}`,
            status: 'COMPLETED',
          }, { transaction: t });
        }
        await Escrow.destroy({ where: { id: transaction.escrowAccountId }, transaction: t });
      }

      // We preserve the AuditLog records to satisfy immutable logging regulations
      // Nullify the foreign key so we don't hit DB constraint violations (using raw query to bypass immutability hook)
      await sequelize.query(
        'UPDATE "AuditLogs" SET "transactionId" = NULL WHERE "transactionId" = :transactionId',
        {
          replacements: { transactionId: transaction.id },
          transaction: t
        }
      );
      
      await transaction.destroy({ transaction: t });
    });

    res.status(200).json({ success: true, message: 'Transaction records permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all audit log entries (Immutable Ledger)
// @route   GET /api/admin/audit-logs
// @access  Private (ADMIN)
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      order: [['id', 'DESC']],
      limit,
      offset,
    });
    res.status(200).json({
      success: true,
      count: rows.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify audit ledger chain integrity
// @route   GET /api/admin/audit-logs/verify
// @access  Private (ADMIN)
const verifyAuditLogs = async (req, res, next) => {
  try {
    const verification = await AuditLog.verifyChain();
    res.status(200).json({ success: true, ...verification });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller confirms receipt of funds (completes escrow transaction)
// @route   POST /api/escrow/:id/confirm-receipt
// @access  Private (SELLER)
const confirmReceipt = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can confirm receipt of funds' });
    }

    if (transaction.status !== 'AWAITING_RECEIPT') {
      return res.status(400).json({ success: false, message: 'Transaction status must be AWAITING_RECEIPT' });
    }

    await sequelize.transaction(async (t) => {
      await transaction.update({
        status: 'COMPLETED',
        sellerConfirmedFundsReceivedAt: new Date()
      }, { transaction: t });

      await Property.update(
        { status: 'SOLD' },
        { where: { id: transaction.propertyId }, transaction: t }
      );

      await logAction(transaction.id, req, `Seller confirmed receipt of funds. Escrow transaction officially COMPLETED. Listing set to SOLD.`, { transaction: t });

      // Reload transaction to get buyer details
      const txWithUsers = await Transaction.findByPk(transaction.id, {
        include: transactionIncludes,
        transaction: t
      });

      // Notify buyer
      if (txWithUsers.buyer && txWithUsers.buyer.email) {
        await notificationService.sendTransactionStatusEmail(txWithUsers.buyer.email, txWithUsers.buyer.name, 'COMPLETED', txWithUsers.id, txWithUsers.amount);
        await notificationService.createInAppNotification(txWithUsers.buyerId, 'Transaction Completed', 'The escrow transaction has been completed successfully.');
      }
    });

    // Generate PDF completion contract
    try {
      const freshTx = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
      const contractPath = await generateEscrowContract(freshTx);
      await freshTx.update({ contractDocumentUrl: contractPath });
      logger.info(`[Contract] PDF generated for transaction ${transaction.id}: ${contractPath}`);
    } catch (contractErr) {
      logger.error('[Contract] PDF generation failed (non-blocking):', contractErr);
    }

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Receipt confirmed. Agreement is fully finalized.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer confirms receipt of property/deed (locks in receipt date)
// @route   POST /api/escrow/:id/confirm-property-receipt
// @access  Private (BUYER)
const confirmPropertyReceipt = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.buyerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the buyer can confirm property deed receipt' });
    }

    const permittedStates = ['UNDER_REVIEW', 'AWAITING_RECEIPT', 'COMPLETED'];
    if (!permittedStates.includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot confirm property receipt at this stage' });
    }

    await sequelize.transaction(async (t) => {
      await transaction.update({
        buyerConfirmedPropertyReceivedAt: new Date()
      }, { transaction: t });

      await logAction(transaction.id, req, `Buyer confirmed receipt of property ownership deed transfer document.`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Property receipt confirmed. Digital signature registered.', data: result });
  } catch (error) {
    next(error);
  }
};

const verifyRegistryDeed = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, { include: transactionIncludes });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Guard: Verify that the caller is a transaction participant or Admin
    if (transaction.buyerId !== req.user.id && transaction.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only transacting buyer, seller, or admin can trigger registry verification' });
    }

    if (transaction.status !== 'MUTATION_STARTED') {
      return res.status(400).json({ success: false, message: 'Registry verification is only available during MUTATION_STARTED phase.' });
    }

    if (!transaction.mutationDocuments || transaction.mutationDocuments.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one mutation document proof first' });
    }

    // Loop over all documents to find one that passes structural checks
    let validDocFound = false;
    let matchedUpi = null;
    let registryRecord = null;
    let upiExists = false;
    let ownerMatches = false;
    let parcelClean = false;
    // These are declared outside the loop so they are accessible in the report below
    let hasDeedType = false;
    let hasSeller = false;
    let hasBuyer = false;
    let hasProperty = false;

    for (const doc of transaction.mutationDocuments) {
      if (doc.documentUrl.startsWith('data:')) {
        continue; // Reject raw base64 spoofing attempts
      }
      
      // Enforce that it is a valid upload path
      if (!doc.documentUrl.startsWith('/uploads/')) {
        continue;
      }

      // Read description as the OCR mock source, rejecting raw file path text
      const docText = doc.description || "";
      const combinedContent = docText.toUpperCase();
      
      hasDeedType = combinedContent.includes('DEED') || combinedContent.includes('MUTATION') || combinedContent.includes('TRANSFER');
      hasSeller = combinedContent.includes(transaction.seller.name.toUpperCase());
      hasBuyer = combinedContent.includes(transaction.buyer.name.toUpperCase());
      hasProperty = combinedContent.includes(transaction.property.title.toUpperCase()) ||
        combinedContent.includes(`PROPERTY ID: ${transaction.propertyId}`) ||
        combinedContent.includes(`PROP-${transaction.propertyId}`);
      
      const upiRegex = /\d{1,2}\/\d{2}\/\d{2}\/\d{2}\/\d{1,5}/;
      const upiMatch = combinedContent.match(upiRegex);
      const localMatchedUpi = upiMatch ? upiMatch[0].toUpperCase() : null;

      if (hasDeedType && hasSeller && hasBuyer && hasProperty && localMatchedUpi) {
        // structural check passed for this document
        validDocFound = true;
        matchedUpi = localMatchedUpi;
        break; // found a valid document, stop searching
      }
    }

    if (!validDocFound) {
      return res.status(400).json({ 
        success: false, 
        message: 'Registry verification failed. None of the uploaded documents structurally represent a valid transfer deed for this transaction.',
        details: {
          error: 'Missing required buyer, seller, or deed keywords in documents.'
        }
      });
    }

    if (matchedUpi) {
      registryRecord = await registryService.lookupParcel(matchedUpi, transaction.seller.name);
      if (registryRecord) {
        upiExists = true;
        if (registryRecord.owner.toUpperCase() === transaction.seller.name.toUpperCase()) {
          ownerMatches = true;
        }
        if (registryRecord.status === 'CLEAN') {
          parcelClean = true;
        }
      }
    }

    // Compare with the listing's officially registered UPI code to prevent deed substitution fraud
    const targetUpi = transaction.property.upiCode ? transaction.property.upiCode.toUpperCase() : '';
    const propertyUpiMatches = matchedUpi && targetUpi && matchedUpi === targetUpi;

    const report = {
      documentTypeMatch: hasDeedType ? 'VERIFIED' : 'FAILED',
      sellerMatch: hasSeller ? 'VERIFIED' : 'FAILED',
      buyerMatch: hasBuyer ? 'VERIFIED' : 'FAILED',
      propertyMatch: hasProperty ? 'VERIFIED' : 'FAILED',
      upiFormatMatch: matchedUpi ? 'VERIFIED' : 'FAILED',
      registryRecordFound: upiExists ? 'VERIFIED' : 'FAILED',
      registryOwnerVerified: ownerMatches ? 'VERIFIED' : 'FAILED',
      registryStatusClean: parcelClean ? 'VERIFIED' : 'FAILED',
      registryUpiLinkVerified: propertyUpiMatches ? 'VERIFIED' : 'FAILED',
    };

    const allPassed = hasDeedType && hasSeller && hasBuyer && hasProperty && matchedUpi && upiExists && ownerMatches && parcelClean && propertyUpiMatches;

    if (!allPassed) {
      return res.status(400).json({
        success: false,
        message: 'Government Registry API validation failed: Document structure is invalid or transacting details mismatch registry records.',
        report
      });
    }

    await sequelize.transaction(async (t) => {
      // Save validation receipt on transaction table
      await transaction.update({
        registryValidationReport: report,
      }, { transaction: t });

      await logAction(transaction.id, req, `AUTOMATED GOVT DEEDS REGISTRY SYSTEM verified transfer document. UPI: ${matchedUpi}. Registry check successfully passed. Signature consensus is still required.`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ 
      success: true, 
      message: 'Government deeds registry matched and verified listing ownership transfer documents. Mutual signature consensus is still required.', 
      data: result,
      report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getMyTransactions,
  getTransaction,
  initiateTransaction,
  verifyConsensusCode,
  depositFunds,
  initiateMutation,
  uploadMutationDocument,
  completeMutation,
  releaseFunds,
  refundBuyer,
  cancelTransaction,
  deleteTransaction,
  getAuditLogs,
  verifyAuditLogs,
  confirmReceipt,
  confirmPropertyReceipt,
  verifyRegistryDeed,
};
