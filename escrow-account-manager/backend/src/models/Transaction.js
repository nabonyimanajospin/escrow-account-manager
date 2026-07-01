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
      'FUNDS_DEPOSITED',
      'MUTATION_INITIATED',
      'MUTATION_IN_PROGRESS',
      'MUTATION_COMPLETED',
      'FUNDS_RELEASED',
      'FAILED',
      'REFUNDED'
    ),
    defaultValue: 'PENDING',
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
    beforeCreate: (transaction) => {
      transaction.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    },
  },
});

module.exports = Transaction;
