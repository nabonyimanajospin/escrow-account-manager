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
  previousHash: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeValidate: async (log) => {
      const timeStr = log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
      
      // Generate Signature: SHA256 of (userId + action + timestamp + ipAddress + userAgent)
      const sigData = `${log.userId || 0}-${log.action}-${timeStr}-${log.ipAddress || 'unknown'}-${log.userAgent || 'unknown'}`;
      log.signature = crypto.createHash('sha256').update(sigData).digest('hex');
      
      // Generate Hash (Immutable block link): SHA256 of (userId + action + timestamp + signature + previousHash + ipAddress)
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
      
      log.previousHash = prevHash;
      const hashData = `${log.userId || 0}-${log.action}-${timeStr}-${log.signature}-${prevHash}-${log.ipAddress || 'unknown'}`;
      log.hash = crypto.createHash('sha256').update(hashData).digest('hex');
    },
    beforeUpdate: () => {
      throw new Error('Audit logs are append-only and cannot be modified');
    },
    beforeDestroy: () => {
      throw new Error('Audit logs are append-only and cannot be deleted');
    },
  }
});

AuditLog.verifyChain = async function () {
  const logs = await AuditLog.findAll({ order: [['id', 'ASC']] });
  let expectedPrevious = '0000000000000000000000000000000000000000000000000000000000000000';

  for (const log of logs) {
    // 1. Verify previous hash link in the blockchain chain
    if (log.previousHash !== expectedPrevious) {
      return { valid: false, failedAt: log.id, reason: 'previous_hash_mismatch' };
    }

    // 2. Recalculate signature and verify block content integrity
    const timeStr = log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
    const sigData = `${log.userId || 0}-${log.action}-${timeStr}-${log.ipAddress || 'unknown'}-${log.userAgent || 'unknown'}`;
    const recalculatedSig = crypto.createHash('sha256').update(sigData).digest('hex');
    if (log.signature !== recalculatedSig) {
      return { valid: false, failedAt: log.id, reason: 'signature_integrity_failure' };
    }

    // 3. Recalculate block hash and verify chain validation
    const hashData = `${log.userId || 0}-${log.action}-${timeStr}-${log.signature}-${log.previousHash}-${log.ipAddress || 'unknown'}`;
    const recalculatedHash = crypto.createHash('sha256').update(hashData).digest('hex');
    if (log.hash !== recalculatedHash) {
      return { valid: false, failedAt: log.id, reason: 'hash_integrity_failure' };
    }

    expectedPrevious = log.hash;
  }

  return { valid: true, checked: logs.length };
};

module.exports = AuditLog;
