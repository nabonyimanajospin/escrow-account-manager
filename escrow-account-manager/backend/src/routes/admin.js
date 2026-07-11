const express = require('express');
const router = express.Router();
const {
  getTransactions,
  releaseFunds,
  refundBuyer,
  deleteTransaction,
  getAuditLogs,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Force protect + ADMIN role for all routes in this file
router.use(protect);
router.use(roleCheck('ADMIN'));

// Get all transactions across the system
router.get('/transactions', getTransactions);

// Release escrow funds to seller
router.post('/transactions/:id/release', releaseFunds);

// Refund buyer
router.post('/transactions/:id/refund', refundBuyer);

// Force delete transaction (safely updating property back to AVAILABLE/SOLD)
router.delete('/transactions/:id', deleteTransaction);

// Get immutable ledger logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
