const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  buyerFee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  sellerFee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  escrowAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      'PENDING',
      'FUNDED',
      'MUTATION_STARTED',
      'UNDER_REVIEW',
      'DISPUTED',
      'AWAITING_RECEIPT',
      'COMPLETED',
      'REFUNDED',
      'CANCELLED'
    ),
    defaultValue: 'PENDING',
  },
  verificationCode: {
    type: DataTypes.STRING(4),
    allowNull: true,
  },
  verificationCodeHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  verificationCodeSalt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  verificationCodeExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  buyerVerificationCodeHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buyerVerificationCodeSalt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buyerVerificationCodeExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sellerVerificationCodeHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sellerVerificationCodeSalt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sellerVerificationCodeExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verificationAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  verificationLockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  buyerAuthorized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sellerAuthorized: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mutationDocuments: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  registryValidationReport: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  depositDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  mutationStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  mutationEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  buyerConfirmedPropertyReceivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sellerConfirmedFundsReceivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refundDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  releaseChecklist: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  buyerSignature: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sellerSignature: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  buyerSignatureDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sellerSignatureDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  /**
   * AI document analysis report — stored when seller uploads mutation docs.
   * Structure: { verdict, confidence, flags, findings, crossChecks, ... }
   */
  documentAnalysisReport: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  },
  contractDocumentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  defaultScope: {
    attributes: { exclude: ['verificationCode', 'verificationCodeHash', 'verificationCodeSalt', 'buyerVerificationCodeHash', 'buyerVerificationCodeSalt', 'sellerVerificationCodeHash', 'sellerVerificationCodeSalt'] }
  },
  scopes: {
    withVerificationCode: {
      attributes: {}
    }
  },
  hooks: {
    beforeValidate: (transaction) => {
      if (!transaction.transactionId) {
        transaction.transactionId = 'TXN-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      }
    },
  },
});

module.exports = Transaction;
