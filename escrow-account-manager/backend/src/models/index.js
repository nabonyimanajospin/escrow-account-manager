const User = require('./User');
const Property = require('./Property');
const Transaction = require('./Transaction');
const Escrow = require('./Escrow');
const AuditLog = require('./AuditLog');

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

module.exports = { User, Property, Transaction, Escrow, AuditLog };
