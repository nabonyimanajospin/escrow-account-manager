const { Dispute, DisputeEvidence, Transaction, Escrow, Property, User, LedgerEntry, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const ledgerService = require('../services/ledgerService');
const notificationService = require('../services/notificationService');

const transactionIncludes = [
  { model: Property, as: 'property' },
  { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] },
  { model: Escrow, as: 'escrowAccount' },
  { model: AuditLog, as: 'auditLogs' },
  { model: LedgerEntry, as: 'ledgerEntries' },
  {
    model: Dispute,
    as: 'dispute',
    include: [{
      model: DisputeEvidence,
      as: 'evidences',
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }]
    }]
  }
];

const logAction = async (transactionId, req, actionDescription, options = {}) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = rawIp.replace('::ffff:', '');
  await AuditLog.create({
    transactionId,
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: actionDescription,
    ipAddress: cleanIp,
    userAgent: req.headers['user-agent'] || 'Unknown Browser',
  }, options);
};

// @desc    Raise a dispute (Locks funds)
// @route   POST /api/escrow/:id/dispute
// @access  Private (BUYER, SELLER)
exports.raiseDispute = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for the dispute' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant = transaction.buyerId === req.user.id || transaction.sellerId === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Only transacting parties can raise a dispute' });
    }

    const disputableStates = ['FUNDED', 'MUTATION_STARTED', 'UNDER_REVIEW'];
    if (!disputableStates.includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot raise dispute at this stage. Escrow must be funded and active.' });
    }

    // Check if there is already an active dispute
    const activeDispute = await Dispute.findOne({ where: { transactionId: transaction.id, status: 'OPEN' } });
    if (activeDispute) {
      return res.status(400).json({ success: false, message: 'A dispute case is already open for this transaction' });
    }

    const result = await sequelize.transaction(async (t) => {
      await transaction.update({ status: 'DISPUTED' }, { transaction: t });
      
      // 7-day buyer protection deadline
      const resolutionDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const dispute = await Dispute.create({
        transactionId: transaction.id,
        initiatorId: req.user.id,
        reason,
        status: 'OPEN',
        resolutionDeadline,
      }, { transaction: t });

      await logAction(transaction.id, req, `${req.user.role} ${req.user.name} raised a formal dispute. Case #${dispute.id} initialized. Escrow locked. Resolution deadline: ${resolutionDeadline.toISOString().split('T')[0]}.`, { transaction: t });
      return dispute;
    });

    // Notify both parties via email (non-blocking)
    const [buyer, seller] = await Promise.all([
      User.findByPk(transaction.buyerId),
      User.findByPk(transaction.sellerId),
    ]);
    const txRef = transaction.reference || `TXN-${transaction.id}`;
    if (buyer) {
      notificationService.sendDisputeNotificationEmail(buyer.email, buyer.name, txRef, 'BUYER').catch(() => {});
      notificationService.createInAppNotification(buyer.id, 'Dispute Filed', `A dispute has been opened on transaction ${txRef}.`).catch(() => {});
    }
    if (seller) {
      notificationService.sendDisputeNotificationEmail(seller.email, seller.name, txRef, 'SELLER').catch(() => {});
      notificationService.createInAppNotification(seller.id, 'Dispute Filed', `A dispute has been opened on transaction ${txRef}.`).catch(() => {});
    }

    const updatedTx = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Dispute successfully filed. Escrow locked. Resolution deadline set to 7 days.', dispute: result, data: updatedTx });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload file evidence for active dispute
// @route   POST /api/escrow/:id/dispute/evidence
// @access  Private (BUYER, SELLER)
exports.uploadEvidence = async (req, res, next) => {
  try {
    // Support both real file uploads (Multer req.file) and legacy URL strings
    let fileUrl = req.body.fileUrl;
    if (req.file) {
      fileUrl = `/uploads/evidence/${req.file.filename}`;
    }
    const { description } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'Evidence file or URL is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isParticipant = transaction.buyerId === req.user.id || transaction.sellerId === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Only transacting parties can upload evidence' });
    }

    const dispute = await Dispute.findOne({ where: { transactionId: transaction.id, status: ['OPEN', 'EVIDENCE_SUBMITTED', 'UNDER_MEDIATION'] } });
    if (!dispute) {
      return res.status(400).json({ success: false, message: 'No active dispute case found to upload evidence to' });
    }

    const evidence = await sequelize.transaction(async (t) => {
      const doc = await DisputeEvidence.create({
        disputeId: dispute.id,
        uploaderId: req.user.id,
        fileUrl,
        description: description || 'Evidence attachment',
      }, { transaction: t });

      if (dispute.status === 'OPEN') {
        await dispute.update({ status: 'EVIDENCE_SUBMITTED' }, { transaction: t });
      }

      await logAction(transaction.id, req, `${req.user.role} ${req.user.name} uploaded dispute evidence document: ${description || 'Evidence attachment'}`, { transaction: t });
      return doc;
    });

    const updatedTx = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Evidence successfully uploaded.', data: updatedTx, evidence });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve dispute as Admin Arbitrator (Release to Seller or Refund to Buyer)
// @route   POST /api/admin/transactions/:id/resolve-dispute
// @access  Private (ADMIN)
exports.resolveDispute = async (req, res, next) => {
  try {
    const { decision, mediatorNotes } = req.body;
    if (!decision || !['RELEASE_TO_SELLER', 'REFUND_TO_BUYER'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid decision: RELEASE_TO_SELLER or REFUND_TO_BUYER' });
    }
    if (!mediatorNotes) {
      return res.status(400).json({ success: false, message: 'Please provide the mediator written ruling notes/reason' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'DISPUTED') {
      return res.status(400).json({ success: false, message: 'Transaction must be in DISPUTED state' });
    }

    const dispute = await Dispute.findOne({ where: { transactionId: transaction.id, status: ['OPEN', 'EVIDENCE_SUBMITTED', 'UNDER_MEDIATION'] } });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Open dispute case not found' });
    }

    if (!transaction.escrowAccountId) {
      return res.status(400).json({ success: false, message: 'Transaction has no associated escrow account' });
    }
    const escrow = await Escrow.findByPk(transaction.escrowAccountId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const balance = parseFloat(escrow.balance);

    await sequelize.transaction(async (t) => {
      // 1. Resolve dispute case record
      await dispute.update({
        mediatorId: req.user.id,
        mediatorDecision: decision,
        mediatorNotes,
        status: 'RESOLVED',
      }, { transaction: t });

      if (decision === 'RELEASE_TO_SELLER') {
        // Platform fee splits
        const sellerNetPayout = parseFloat(transaction.amount) - parseFloat(transaction.sellerFee);
        const platformFee = parseFloat(transaction.buyerFee) + parseFloat(transaction.sellerFee);

        const releaseHistory = [...escrow.releaseHistory, {
          amount: sellerNetPayout,
          platformFee,
          date: new Date(),
          reference: `ARB-REL-${Date.now()}`,
          status: 'COMPLETED',
        }];

        await escrow.update({ balance: 0.00, status: 'RELEASED', releaseHistory }, { transaction: t });
        await transaction.update({ status: 'AWAITING_RECEIPT', releaseDate: new Date() }, { transaction: t });

        // Double-entry bookkeeping
        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'DEBIT',
          amount: balance,
          accountType: 'ESCROW_CUSTODY',
          description: 'Arbitrator custody debit for release resolution',
        }, t);

        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'CREDIT',
          amount: sellerNetPayout,
          accountType: 'SELLER_CASH',
          description: 'Arbitrator credit payout to seller wallet',
        }, t);

        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'CREDIT',
          amount: platformFee,
          accountType: 'PLATFORM_REVENUE',
          description: 'Arbitrator credit platform service commissions',
        }, t);

        await logAction(transaction.id, req, `Arbitrator resolved dispute in favor of Seller. Funds released. Status set to AWAITING_RECEIPT. Ruling: ${mediatorNotes}`, { transaction: t });
      } else {
        // Refund to Buyer
        await escrow.update({ balance: 0.00, status: 'REFUNDED' }, { transaction: t });
        await transaction.update({ status: 'REFUNDED', refundDate: new Date() }, { transaction: t });
        await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

        // Double-entry bookkeeping
        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'DEBIT',
          amount: balance,
          accountType: 'ESCROW_CUSTODY',
          description: 'Arbitrator custody debit to return to buyer',
        }, t);

        await ledgerService.recordEntry({
          transactionId: transaction.id,
          escrowAccountId: escrow.id,
          type: 'CREDIT',
          amount: balance,
          accountType: 'BUYER_CASH',
          description: 'Arbitrator credit refund of deposit to buyer account',
        }, t);

        await logAction(transaction.id, req, `Arbitrator resolved dispute in favor of Buyer. Full refund issued. Listing set to AVAILABLE. Ruling: ${mediatorNotes}`, { transaction: t });
      }
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Dispute successfully resolved. Decision: ${decision}`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Change dispute status to UNDER_MEDIATION (Admin only)
// @route   POST /api/escrow/:id/dispute/mediate
// @access  Private (ADMIN)
exports.mediateDispute = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (transaction.status !== 'DISPUTED') {
      return res.status(400).json({ success: false, message: 'Transaction is not in DISPUTED state' });
    }

    const dispute = await Dispute.findOne({
      where: { transactionId: transaction.id, status: ['OPEN', 'EVIDENCE_SUBMITTED'] }
    });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Active open dispute not found' });
    }

    await dispute.update({ status: 'UNDER_MEDIATION' });
    await logAction(transaction.id, req, `Admin Mediator ${req.user.name} initiated active mediation investigation on dispute Case #${dispute.id}`);

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: 'Dispute status updated to active mediation.', data: result });
  } catch (error) {
    next(error);
  }
};
