const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EscrowAccount = sequelize.define('EscrowAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'RELEASED', 'REFUNDED', 'CLOSED'),
    defaultValue: 'ACTIVE',
  },
  depositHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  releaseHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (escrow) => {
      escrow.accountNumber = 'ESC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    },
  },
});

module.exports = EscrowAccount;
