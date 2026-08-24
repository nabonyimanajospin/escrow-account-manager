const { Op } = require('sequelize');
const { Transaction } = require('../models');

/** Escrow states that reserve a listing on the public marketplace. */
const ACTIVE_ESCROW_STATES = [
  'PENDING',
  'FUNDED',
  'MUTATION_STARTED',
  'UNDER_REVIEW',
  'DISPUTED',
  'AWAITING_RECEIPT',
];

async function getLockedPropertyIds() {
  const rows = await Transaction.findAll({
    where: { status: { [Op.in]: ACTIVE_ESCROW_STATES } },
    attributes: ['propertyId'],
    raw: true,
  });
  return new Set((rows || []).map((row) => row.propertyId));
}


async function propertyHasActiveEscrow(propertyId, dbTransaction = null) {
  const count = await Transaction.count({
    where: {
      propertyId,
      status: { [Op.in]: ACTIVE_ESCROW_STATES },
    },
    transaction: dbTransaction,
  });
  return count > 0;
}

module.exports = {
  ACTIVE_ESCROW_STATES,
  getLockedPropertyIds,
  propertyHasActiveEscrow,
};
