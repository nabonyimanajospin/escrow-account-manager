const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * WalletTransaction — ledger for seller wallet credits and withdrawal requests.
 */
const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('CREDIT', 'WITHDRAWAL_REQUEST', 'WITHDRAWAL_PAID'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true, // escrow transaction reference for credits
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('COMPLETED', 'PENDING', 'REJECTED'),
    defaultValue: 'COMPLETED',
  },
}, {
  timestamps: true,
});

module.exports = WalletTransaction;
