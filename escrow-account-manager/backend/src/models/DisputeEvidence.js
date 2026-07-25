const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DisputeEvidence = sequelize.define('DisputeEvidence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  disputeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uploaderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = DisputeEvidence;
