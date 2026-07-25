const { LedgerEntry } = require('../models');

/**
 * Helper to record a single debit or credit entry in the bookkeeping ledger.
 * @param {Object} params
 * @param {Number} params.transactionId
 * @param {Number} params.escrowAccountId
 * @param {String} params.type - 'DEBIT' or 'CREDIT'
 * @param {Number} params.amount
 * @param {String} params.accountType - 'BUYER_CASH' | 'SELLER_CASH' | 'PLATFORM_REVENUE' | 'ESCROW_CUSTODY'
 * @param {String} params.description
 * @param {Object} [t] - Optional sequelize transaction context
 */
exports.recordEntry = async ({ transactionId, escrowAccountId, type, amount, accountType, description }, t) => {
  return await LedgerEntry.create({
    transactionId,
    escrowAccountId,
    type,
    amount,
    accountType,
    description,
  }, { transaction: t });
};
