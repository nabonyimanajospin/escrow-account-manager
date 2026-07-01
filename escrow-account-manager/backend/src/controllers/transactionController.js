const { Transaction, EscrowAccount, Property, User } = require('../models');

// Shared include config for full transaction details
const transactionIncludes = [
  { model: Property, as: 'property' },
  { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] },
  { model: EscrowAccount, as: 'escrowAccount' },
];

// @desc    Get all transactions (Admin) or own transactions (Buyer/Seller)
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'BUYER') where.buyerId = req.user.id;
    if (req.user.role === 'SELLER') where.sellerId = req.user.id;

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

// @desc    Get own transactions only
// @route   GET /api/transactions/my
// @access  Private (BUYER, SELLER)
exports.getMyTransactions = async (req, res, next) => {
  try {
    const where = req.user.role === 'BUYER'
      ? { buyerId: req.user.id }
      : { sellerId: req.user.id };

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

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private (participant or admin)
exports.getTransaction = async (req, res, next) => {
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

// @desc    Buyer initiates a transaction
// @route   POST /api/transactions/initiate
// @access  Private (BUYER)
exports.initiateTransaction = async (req, res, next) => {
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

    // Create transaction
    const transaction = await Transaction.create({
      propertyId: property.id,
      buyerId: req.user.id,
      sellerId: property.sellerId,
      amount: property.price,
      status: 'PENDING',
    });

    // Create escrow account linked to this transaction
    const escrowAccount = await EscrowAccount.create({
      transactionId: transaction.id,
      balance: 0.00,
      status: 'ACTIVE',
    });

    // Link escrow account back to transaction
    await transaction.update({ escrowAccountId: escrowAccount.id });

    // Set property to PENDING
    await property.update({ status: 'PENDING' });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Buyer deposits funds to escrow
// @route   POST /api/transactions/:id/deposit
// @access  Private (BUYER)
exports.depositFunds = async (req, res, next) => {
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
      return res.status(400).json({ success: false, message: 'Transaction is not in PENDING state' });
    }

    // Compare as numbers to avoid decimal mismatch
    if (parseFloat(amount) !== parseFloat(transaction.amount)) {
      return res.status(400).json({ success: false, message: `Amount must be exactly ${transaction.amount}` });
    }

    const escrowAccount = await EscrowAccount.findByPk(transaction.escrowAccountId);

    // Add deposit to history
    const depositHistory = [...escrowAccount.depositHistory, {
      amount: parseFloat(amount),
      date: new Date(),
      reference: reference || `DEP-${Date.now()}`,
      status: 'COMPLETED',
    }];

    await escrowAccount.update({
      balance: parseFloat(amount),
      depositHistory,
    });

    await transaction.update({
      status: 'FUNDS_DEPOSITED',
      depositDate: new Date(),
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller initiates mutation process
// @route   POST /api/transactions/:id/initiate-mutation
// @access  Private (SELLER)
exports.initiateMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can initiate mutation' });
    }

    if (transaction.status !== 'FUNDS_DEPOSITED') {
      return res.status(400).json({ success: false, message: 'Mutation can only be initiated after funds are deposited' });
    }

    await transaction.update({
      status: 'MUTATION_INITIATED',
      mutationStartDate: new Date(),
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller uploads mutation document
// @route   POST /api/transactions/:id/upload-document
// @access  Private (SELLER)
exports.uploadMutationDocument = async (req, res, next) => {
  try {
    const { documentUrl, description } = req.body;

    if (!documentUrl) {
      return res.status(400).json({ success: false, message: 'Document URL or reference is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the seller can upload documents' });
    }

    if (!['MUTATION_INITIATED', 'MUTATION_IN_PROGRESS'].includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot upload documents at this stage' });
    }

    const mutationDocuments = [...transaction.mutationDocuments, {
      documentUrl,
      description: description || 'Mutation document',
      uploadedAt: new Date(),
    }];

    await transaction.update({
      mutationDocuments,
      status: 'MUTATION_IN_PROGRESS',
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller or Admin marks mutation as complete
// @route   POST /api/transactions/:id/complete-mutation
// @access  Private (SELLER, ADMIN)
exports.completeMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const isAuthorized = transaction.sellerId === req.user.id || req.user.role === 'ADMIN';
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete mutation' });
    }

    if (!['MUTATION_INITIATED', 'MUTATION_IN_PROGRESS'].includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Mutation is not in progress' });
    }

    await transaction.update({
      status: 'MUTATION_COMPLETED',
      mutationEndDate: new Date(),
    });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin releases escrow funds to seller
// @route   POST /api/transactions/:id/release
// @access  Private (ADMIN)
exports.releaseFunds = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status !== 'MUTATION_COMPLETED') {
      return res.status(400).json({ success: false, message: 'Transaction must be in MUTATION_COMPLETED state to release funds' });
    }

    const escrowAccount = await EscrowAccount.findByPk(transaction.escrowAccountId);
    if (!escrowAccount) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const amount = parseFloat(escrowAccount.balance);

    const releaseHistory = [...escrowAccount.releaseHistory, {
      amount,
      date: new Date(),
      reference: `REL-${Date.now()}`,
      status: 'COMPLETED',
    }];

    await escrowAccount.update({ balance: 0.00, status: 'RELEASED', releaseHistory });
    await transaction.update({ status: 'FUNDS_RELEASED', releaseDate: new Date() });
    await Property.update({ status: 'SOLD' }, { where: { id: transaction.propertyId } });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Released ${amount} to seller successfully`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin refunds buyer
// @route   POST /api/transactions/:id/refund
// @access  Private (ADMIN)
exports.refundBuyer = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const refundableStates = ['FUNDS_DEPOSITED', 'MUTATION_INITIATED', 'MUTATION_IN_PROGRESS', 'MUTATION_COMPLETED'];
    if (!refundableStates.includes(transaction.status)) {
      return res.status(400).json({ success: false, message: 'Cannot refund at this stage' });
    }

    const escrowAccount = await EscrowAccount.findByPk(transaction.escrowAccountId);
    if (!escrowAccount) {
      return res.status(404).json({ success: false, message: 'Escrow account not found' });
    }

    const amount = parseFloat(escrowAccount.balance);

    await escrowAccount.update({ balance: 0.00, status: 'REFUNDED' });
    await transaction.update({ status: 'REFUNDED', refundDate: new Date() });
    await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId } });

    const result = await Transaction.findByPk(transaction.id, { include: transactionIncludes });
    res.status(200).json({ success: true, message: `Refunded ${amount} to buyer successfully`, data: result });
  } catch (error) {
    next(error);
  }
};
