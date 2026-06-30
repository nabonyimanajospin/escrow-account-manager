const Transaction = require('../models/Transaction');
const EscrowAccount = require('../models/EscrowAccount');
const Property = require('../models/Property');

// @desc    Get all transactions related to logged-in user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    let query = {};

    // Admin sees all, buyer/seller see their own
    if (req.user.role === 'BUYER') {
      query.buyer = req.user.id;
    } else if (req.user.role === 'SELLER') {
      query.seller = req.user.id;
    }

    const transactions = await Transaction.find(query)
      .populate('property')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('escrowAccount');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('property')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .populate('escrowAccount');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify authorized access
    if (
      transaction.buyer._id.toString() !== req.user.id &&
      transaction.seller._id.toString() !== req.user.id &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate transaction
// @route   POST /api/transactions/initiate
// @access  Private (Buyer)
exports.initiateTransaction = async (req, res, next) => {
  try {
    const { propertyId } = req.body;
    const buyerId = req.user.id;

    // Get property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if property is available
    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Property is not available for transaction'
      });
    }

    // Check if buyer is not the seller
    if (property.seller.toString() === buyerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot buy your own property'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      property: propertyId,
      buyer: buyerId,
      seller: property.seller,
      amount: property.price,
      status: 'PENDING'
    });

    // Update property status
    property.status = 'PENDING';
    await property.save();

    // Create escrow account
    const escrowAccount = await EscrowAccount.create({
      transaction: transaction._id,
      balance: 0,
      status: 'ACTIVE'
    });

    // Update transaction with escrow account
    transaction.escrowAccount = escrowAccount._id;
    await transaction.save();

    res.status(201).json({
      success: true,
      data: {
        transaction,
        escrowAccount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deposit funds to escrow
// @route   POST /api/transactions/:id/deposit
// @access  Private (Buyer)
exports.depositFunds = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { amount, reference } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if buyer is the one depositing
    if (transaction.buyer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer can deposit funds'
      });
    }

    // Check if transaction is in correct state
    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Transaction is not in pending state'
      });
    }

    // Check if amount matches transaction amount
    if (amount !== transaction.amount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be exactly ${transaction.amount}`
      });
    }

    // Update escrow account
    const escrowAccount = await EscrowAccount.findById(transaction.escrowAccount);
    escrowAccount.balance += amount;
    escrowAccount.depositHistory.push({
      amount,
      date: new Date(),
      reference: reference || `DEP-${Date.now()}`,
      status: 'COMPLETED'
    });
    await escrowAccount.save();

    // Update transaction
    transaction.status = 'FUNDS_DEPOSITED';
    transaction.depositDate = new Date();
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller initiates mutation process
// @route   POST /api/transactions/:id/initiate-mutation
// @access  Private (Seller)
exports.initiateMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify req.user is the seller
    if (transaction.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can initiate mutation'
      });
    }

    // Must be in FUNDS_DEPOSITED state
    if (transaction.status !== 'FUNDS_DEPOSITED') {
      return res.status(400).json({
        success: false,
        message: 'Mutation can only be initiated after funds are deposited'
      });
    }

    transaction.status = 'MUTATION_INITIATED';
    transaction.mutationStartDate = new Date();
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller uploads mutation documents
// @route   POST /api/transactions/:id/upload-document
// @access  Private (Seller)
exports.uploadMutationDocument = async (req, res, next) => {
  try {
    const { documentUrl, description } = req.body;
    if (!documentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Document URL is required'
      });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify req.user is the seller
    if (transaction.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can upload documents'
      });
    }

    // State check
    if (!['MUTATION_INITIATED', 'MUTATION_IN_PROGRESS'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload mutation documents at this stage'
      });
    }

    transaction.mutationDocuments.push({
      documentUrl,
      description: description || 'Mutation progress document',
      uploadedAt: new Date()
    });

    transaction.status = 'MUTATION_IN_PROGRESS';
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller or Admin completes mutation
// @route   POST /api/transactions/:id/complete-mutation
// @access  Private (Seller/Admin)
exports.completeMutation = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify role
    if (transaction.seller.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete mutation'
      });
    }

    if (!['MUTATION_INITIATED', 'MUTATION_IN_PROGRESS'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Mutation is not in progress or initiated'
      });
    }

    transaction.status = 'MUTATION_COMPLETED';
    transaction.mutationEndDate = new Date();
    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Release funds to seller
// @route   POST /api/transactions/:id/release
// @access  Private (Admin only)
exports.releaseFunds = async (req, res, next) => {
  try {
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction is in correct state
    if (transaction.status !== 'MUTATION_COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Transaction must be in MUTATION_COMPLETED state to release funds'
      });
    }

    // Get escrow account
    const escrowAccount = await EscrowAccount.findById(transaction.escrowAccount);
    if (!escrowAccount) {
      return res.status(404).json({
        success: false,
        message: 'Escrow account not found'
      });
    }
    
    // Release funds
    const amount = escrowAccount.balance;
    escrowAccount.balance = 0;
    escrowAccount.status = 'RELEASED';
    escrowAccount.releaseHistory.push({
      amount,
      date: new Date(),
      reference: `REL-${Date.now()}`,
      status: 'COMPLETED'
    });
    await escrowAccount.save();

    // Update transaction
    transaction.status = 'FUNDS_RELEASED';
    transaction.releaseDate = new Date();
    await transaction.save();

    // Update property status to SOLD
    const property = await Property.findById(transaction.property);
    property.status = 'SOLD';
    await property.save();

    res.status(200).json({
      success: true,
      data: transaction,
      message: `Released ${amount} to seller successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund buyer
// @route   POST /api/transactions/:id/refund
// @access  Private (Admin only)
exports.refundBuyer = async (req, res, next) => {
  try {
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction is in a refundable state (FUNDS_DEPOSITED, MUTATION_INITIATED, MUTATION_IN_PROGRESS, MUTATION_COMPLETED)
    const refundableStates = ['FUNDS_DEPOSITED', 'MUTATION_INITIATED', 'MUTATION_IN_PROGRESS', 'MUTATION_COMPLETED'];
    if (!refundableStates.includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund at this stage'
      });
    }

    // Get escrow account
    const escrowAccount = await EscrowAccount.findById(transaction.escrowAccount);
    if (!escrowAccount) {
      return res.status(404).json({
        success: false,
        message: 'Escrow account not found'
      });
    }
    
    // Refund funds
    const amount = escrowAccount.balance;
    escrowAccount.balance = 0;
    escrowAccount.status = 'REFUNDED';
    await escrowAccount.save();

    // Update transaction
    transaction.status = 'REFUNDED';
    transaction.refundDate = new Date();
    await transaction.save();

    // Revert property status to AVAILABLE
    const property = await Property.findById(transaction.property);
    property.status = 'AVAILABLE';
    await property.save();

    res.status(200).json({
      success: true,
      data: transaction,
      message: `Refunded ${amount} to buyer successfully`
    });
  } catch (error) {
    next(error);
  }
};
