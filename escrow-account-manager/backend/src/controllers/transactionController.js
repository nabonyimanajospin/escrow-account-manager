const { Transaction, Escrow, Property, User, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// Shared include configuration
const transactionIncludes = [
  { model: Property, as: 'property' },
  { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] },
  { model: Escrow, as: 'escrowAccount' },
  { model: AuditLog, as: 'auditLogs' },
];

// Helper to log actions to immutable ledger (propagates errors to enable transaction rollbacks)
const logAction = async (transactionId, req, actionDescription, options = {}) => {
  try {
    await AuditLog.create({
      transactionId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: actionDescription,
    }, options);
  } catch (err) {
    console.error('Failed to log audit action:', err.message);
    throw new Error('Ledger logging failed: ' + err.message);
  }
};

// @desc    Get all transactions (Admin only)
// @route   GET /api/admin/transactions
// @access  Private (ADMIN)
const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      include: transactionIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: transactions.length, data: transactions });
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

    const transactions = await Transaction.findAll({
      where,
      include: transactionIncludes,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ success: true, count: transactions.length, data: transactions });
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

    // Auto-expiration check for PENDING deals (10 minutes limit)
    const EXPIRATION_LIMIT = 10 * 60 * 1000;
    if (transaction.status === 'PENDING') {
      const timeElapsed = Date.now() - new Date(transaction.createdAt).getTime();
      if (timeElapsed > EXPIRATION_LIMIT) {
        await sequelize.transaction(async (t) => {
          transaction.status = 'REFUNDED';
          await transaction.save({ transaction: t });

          // Unlock property back to AVAILABLE
          await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

          // Log to immutable block ledger
          await AuditLog.create({
            transactionId: transaction.id,
            userId: transaction.buyerId,
            userName: 'SYSTEM_DAEMON',
            userRole: 'SYSTEM',
            action: 'AUTO_CANCEL_EXPIRED_PENDING',
          }, { transaction: t });
        });

        // Re-fetch transaction with updated relation attributes and logs
        const updatedTransaction = await Transaction.findByPk(req.params.id, {
          include: transactionIncludes,
        });
        return res.status(200).json({ success: true, data: updatedTransaction });
      }
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
      // Create transaction (starts as PENDING)
      const transaction = await Transaction.create({
        propertyId: property.id,
        buyerId: req.user.id,
        sellerId: property.sellerId,
        amount: property.price,
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

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant = transaction.buyerId === req.user.id || transaction.sellerId === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Only buyer or seller can sign consensus codes' });
    }

    if (code !== transaction.verificationCode) {
      return res.status(400).json({ success: false, message: 'Consensus code does not match. Please verify code.' });
    }

    await sequelize.transaction(async (t) => {
      if (req.user.role === 'BUYER') {
        transaction.buyerAuthorized = true;
        await transaction.save({ transaction: t });
        await logAction(transaction.id, req, `Buyer ${req.user.name} approved state verification code ${code}`, { transaction: t });
      } else if (req.user.role === 'SELLER') {
        transaction.sellerAuthorized = true;
        await transaction.save({ transaction: t });
        await logAction(transaction.id, req, `Seller ${req.user.name} approved state verification code ${code}`, { transaction: t });
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

    if (parseFloat(amount) !== parseFloat(transaction.amount)) {
      return res.status(400).json({ success: false, message: `Deposit amount must be exactly ${transaction.amount}` });
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

      // Update status to FUNDED and reset authorizations + generate new verification code
      const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
      await transaction.update({
        status: 'FUNDED',
        depositDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
        verificationCode: nextCode,
      }, { transaction: t });

      await logAction(transaction.id, req, `Funds deposited: $${amount} locked in escrow address ${escrow.contractAddress}`, { transaction: t });
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

    if (!transaction.buyerAuthorized || !transaction.sellerAuthorized) {
      return res.status(400).json({ success: false, message: 'Cryptographic consensus required. Both parties must submit verification codes.' });
    }

    await sequelize.transaction(async (t) => {
      const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
      await transaction.update({
        status: 'MUTATION_STARTED',
        mutationStartDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
        verificationCode: nextCode,
      }, { transaction: t });

      await logAction(transaction.id, req, `Seller initiated ownership mutation (legal transfer)`, { transaction: t });
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

    if (!transaction.buyerAuthorized || !transaction.sellerAuthorized) {
      return res.status(400).json({ success: false, message: 'Cryptographic consensus required. Both parties must submit verification codes.' });
    }

    await sequelize.transaction(async (t) => {
      const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
      await transaction.update({
        status: 'UNDER_REVIEW',
        mutationEndDate: new Date(),
        buyerAuthorized: false,
        sellerAuthorized: false,
        verificationCode: nextCode,
      }, { transaction: t });

      await logAction(transaction.id, req, `Mutation completed and submitted under review for Admin verification`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Mutation submitted for Admin verification.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin releases funds to seller
// @route   POST /api/admin/transactions/:id/release
// @access  Private (ADMIN)
const releaseFunds = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ success: false, message: 'Transaction must be UNDER_REVIEW to release funds' });
    }

    const escrow = await Escrow.findByPk(transaction.escrowAccountId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const amount = parseFloat(escrow.balance);

    await sequelize.transaction(async (t) => {
      const releaseHistory = [...escrow.releaseHistory, {
        amount,
        date: new Date(),
        reference: `REL-${Date.now()}`,
        status: 'COMPLETED',
      }];

      await escrow.update({ balance: 0.00, status: 'RELEASED', releaseHistory }, { transaction: t });
      await transaction.update({ status: 'COMPLETED', releaseDate: new Date() }, { transaction: t });
      await Property.update({ status: 'SOLD' }, { where: { id: transaction.propertyId }, transaction: t });

      await logAction(transaction.id, req, `Admin released escrow balance of $${amount} to Seller. Deal completed successfully.`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Funds successfully released to seller.`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin refunds buyer
// @route   POST /api/admin/transactions/:id/refund
// @access  Private (ADMIN)
const refundBuyer = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const refundableStates = ['FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'];
    if (!refundableStates.includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot refund at this state' });
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

      await logAction(transaction.id, req, `Admin rejected mutation and refunded escrow balance of $${amount} to Buyer.`, { transaction: t });
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

    const escrow = await Escrow.findByPk(transaction.escrowAccountId);

    await sequelize.transaction(async (t) => {
      if (transaction.status === 'FUNDED' && escrow) {
        await escrow.update({ balance: 0.00, status: 'REFUNDED' }, { transaction: t });
      }

      await transaction.update({ status: 'REFUNDED', refundDate: new Date() }, { transaction: t });
      await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

      await logAction(transaction.id, req, `Transaction cancelled by Buyer. Escrow returned to AVAILABLE.`, { transaction: t });
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Transaction cancelled successfully.', data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin deletes transaction records
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
        await Escrow.destroy({ where: { id: transaction.escrowAccountId }, transaction: t });
      }

      await AuditLog.destroy({ where: { transactionId: transaction.id }, transaction: t });
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
    const logs = await AuditLog.findAll({
      order: [['id', 'DESC']],
    });
    res.status(200).json({ success: true, count: logs.length, data: logs });
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
};
