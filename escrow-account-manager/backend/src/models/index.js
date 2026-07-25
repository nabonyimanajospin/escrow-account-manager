const User = require('./User');
const Property = require('./Property');
const Transaction = require('./Transaction');
const Escrow = require('./Escrow');
const AuditLog = require('./AuditLog');
const Offer = require('./Offer');
const LedgerEntry = require('./LedgerEntry');
const Dispute = require('./Dispute');
const DisputeEvidence = require('./DisputeEvidence');
const Notification = require('./Notification');
const WalletTransaction = require('./WalletTransaction');

// User — Property associations
User.hasMany(Property, { foreignKey: 'sellerId', as: 'properties' });
Property.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// User — Transaction associations (as buyer and as seller)
User.hasMany(Transaction, { foreignKey: 'buyerId', as: 'purchasedTransactions' });
User.hasMany(Transaction, { foreignKey: 'sellerId', as: 'sellingTransactions' });
Transaction.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Transaction.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// Property — Transaction association
Property.hasMany(Transaction, { foreignKey: 'propertyId', as: 'transactions' });
Transaction.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Transaction — Escrow association
Transaction.hasOne(Escrow, { foreignKey: 'transactionId', as: 'escrowAccount' });
Escrow.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

// Transaction — AuditLog association
Transaction.hasMany(AuditLog, { foreignKey: 'transactionId', as: 'auditLogs' });
AuditLog.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

// Property — Offer associations
Property.hasMany(Offer, { foreignKey: 'propertyId', as: 'offers' });
Offer.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// User — Offer associations
User.hasMany(Offer, { foreignKey: 'buyerId', as: 'buyerOffers' });
Offer.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

// Transaction/Escrow — LedgerEntry associations
Transaction.hasMany(LedgerEntry, { foreignKey: 'transactionId', as: 'ledgerEntries' });
LedgerEntry.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });
Escrow.hasMany(LedgerEntry, { foreignKey: 'escrowAccountId', as: 'ledgerEntries' });
LedgerEntry.belongsTo(Escrow, { foreignKey: 'escrowAccountId', as: 'escrowAccount' });

// Dispute — Transaction / User associations
Transaction.hasOne(Dispute, { foreignKey: 'transactionId', as: 'dispute' });
Dispute.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

User.hasMany(Dispute, { foreignKey: 'initiatorId', as: 'initiatedDisputes' });
Dispute.belongsTo(User, { foreignKey: 'initiatorId', as: 'initiator' });

User.hasMany(Dispute, { foreignKey: 'mediatorId', as: 'mediatedDisputes' });
Dispute.belongsTo(User, { foreignKey: 'mediatorId', as: 'mediator' });

// Dispute — DisputeEvidence associations
Dispute.hasMany(DisputeEvidence, { foreignKey: 'disputeId', as: 'evidences' });
DisputeEvidence.belongsTo(Dispute, { foreignKey: 'disputeId', as: 'dispute' });

User.hasMany(DisputeEvidence, { foreignKey: 'uploaderId', as: 'uploadedEvidences' });
DisputeEvidence.belongsTo(User, { foreignKey: 'uploaderId', as: 'uploader' });

// User — Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User — WalletTransaction associations
User.hasMany(WalletTransaction, { foreignKey: 'userId', as: 'walletTransactions' });
WalletTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Property, Transaction, Escrow, AuditLog, Offer, LedgerEntry, Dispute, DisputeEvidence, Notification, WalletTransaction };
