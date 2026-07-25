const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Dispute = sequelize.define('Dispute', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  initiatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mediatorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mediatorDecision: {
    type: DataTypes.ENUM('RELEASE_TO_SELLER', 'REFUND_TO_BUYER', 'PENDING'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  mediatorNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'EVIDENCE_SUBMITTED', 'UNDER_MEDIATION', 'RESOLVED'),
    defaultValue: 'OPEN',
    allowNull: false,
  },
  resolutionDeadline: {
    type: DataTypes.DATE,
    allowNull: true, // set to createdAt + 7 days on creation
  },
}, {
  timestamps: true,
});

module.exports = Dispute;
