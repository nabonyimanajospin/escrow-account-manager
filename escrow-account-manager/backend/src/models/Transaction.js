const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
      'COMPLETED',
      'REFUNDED'
    ),
    defaultValue: 'PENDING',
  },
  verificationCode: {
    type: DataTypes.STRING(4),
    allowNull: false,
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
  refundDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (transaction) => {
      if (!transaction.transactionId) {
        transaction.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      }
      if (!transaction.verificationCode) {
        // Generate random 4-digit code
        transaction.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      }
    },
  },
});

module.exports = Transaction;
