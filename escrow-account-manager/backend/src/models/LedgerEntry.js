const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LedgerEntry = sequelize.define('LedgerEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  escrowAccountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('DEBIT', 'CREDIT'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  accountType: {
    type: DataTypes.ENUM('BUYER_CASH', 'SELLER_CASH', 'PLATFORM_REVENUE', 'ESCROW_CUSTODY'),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = LedgerEntry;
