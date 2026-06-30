const mongoose = require('mongoose');

const EscrowAccountSchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RELEASED', 'REFUNDED', 'CLOSED'],
    default: 'ACTIVE'
  },
  depositHistory: [{
    amount: Number,
    date: Date,
    reference: String,
    status: String
  }],
  releaseHistory: [{
    amount: Number,
    date: Date,
    reference: String,
    status: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate account number
EscrowAccountSchema.pre('save', function(next) {
  if (!this.accountNumber) {
    this.accountNumber = 'ESC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EscrowAccount', EscrowAccountSchema);
