const User = require('./User');
const Property = require('./Property');
const Transaction = require('./Transaction');
const EscrowAccount = require('./EscrowAccount');

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

// Transaction — EscrowAccount association
Transaction.hasOne(EscrowAccount, { foreignKey: 'transactionId', as: 'escrowAccount' });
EscrowAccount.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

module.exports = { User, Property, Transaction, EscrowAccount };
