const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userRole: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  signature: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
  hooks: {
    beforeValidate: async (log) => {
      const timeStr = log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
      
      // Generate Signature: SHA256 of (userId + action + timestamp)
      const sigData = `${log.userId || 0}-${log.action}-${timeStr}`;
      log.signature = crypto.createHash('sha256').update(sigData).digest('hex');
      
      // Generate Hash (Immutable block link): SHA256 of (userId + action + timestamp + signature + previousHash)
      let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis block hash
      try {
        const lastEntry = await AuditLog.findOne({
          order: [['id', 'DESC']]
        });
        if (lastEntry) {
          prevHash = lastEntry.hash;
        }
      } catch (err) {
        console.error('Error fetching last audit log hash:', err.message);
      }
      
      const hashData = `${log.userId || 0}-${log.action}-${timeStr}-${log.signature}-${prevHash}`;
      log.hash = crypto.createHash('sha256').update(hashData).digest('hex');
    }
  }
});

module.exports = AuditLog;
