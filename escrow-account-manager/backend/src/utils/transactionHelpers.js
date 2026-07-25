const { Property, User, Escrow, AuditLog, LedgerEntry, Dispute, DisputeEvidence } = require('../models');

const transactionIncludes = [
  { model: Property, as: 'property' },
  { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] },
  { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] },
  { model: Escrow, as: 'escrowAccount' },
  { model: AuditLog, as: 'auditLogs' },
  { model: LedgerEntry, as: 'ledgerEntries' },
  {
    model: Dispute,
    as: 'dispute',
    include: [{
      model: DisputeEvidence,
      as: 'evidences',
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }]
    }]
  }
];

const logAction = async (transactionId, req, actionDescription, options = {}) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    // Clean IPv6 prefix if local loopback
    const ipAddress = rawIp.replace(/^::ffff:/, '');
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    await AuditLog.create({
      transactionId,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: actionDescription,
      ipAddress,
      userAgent,
    }, options);
  } catch (err) {
    console.error('Failed to log audit action:', err.message);
    throw new Error('Ledger logging failed: ' + err.message);
  }
};

module.exports = {
  transactionIncludes,
  logAction
};
