const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  escrowAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EscrowAccount'
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'FUNDS_DEPOSITED',
      'MUTATION_INITIATED',
      'MUTATION_IN_PROGRESS',
      'MUTATION_COMPLETED',
      'FUNDS_RELEASED',
      'FAILED',
      'REFUNDED'
    ],
    default: 'PENDING'
  },
  mutationDocuments: [{
    documentUrl: {
      type: String
    },
    description: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  depositDate: Date,
  mutationStartDate: Date,
  mutationEndDate: Date,
  releaseDate: Date,
  refundDate: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate transaction ID
TransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);
