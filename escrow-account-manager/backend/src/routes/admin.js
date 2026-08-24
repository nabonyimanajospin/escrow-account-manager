const express = require('express');
const router = express.Router();
const {
  getTransactions,
  releaseFunds,
  refundBuyer,
  deleteTransaction,
  getAuditLogs,
  verifyAuditLogs,
  simulateIremboWebhook,
  simulateMomoWebhook,
} = require('../controllers/transactionController');
const {
  approveWithdrawal,
  rejectWithdrawal,
  approveWalletDeposit,
  rejectWalletDeposit,
  getPendingWalletDeposits,
  getPendingWithdrawals,
  getPlatformSummary,
} = require('../controllers/walletController');
const { getPendingKyc, approveKyc, rejectKyc } = require('../controllers/kycController');
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

// Institutional Webhook Simulation Endpoints (for live presentation demos)
router.post('/simulate/irembo/:id', simulateIremboWebhook);
router.post('/simulate/momo/:id', simulateMomoWebhook);

// Force delete transaction (safely updating property back to AVAILABLE/SOLD)
router.delete('/transactions/:id', deleteTransaction);

// Get immutable ledger logs
router.get('/audit-logs', getAuditLogs);

// Verify audit logs integrity chain
router.get('/audit-logs/verify', verifyAuditLogs);

// Platform treasury overview
router.get('/platform-summary', getPlatformSummary);

// Wallet management
router.get('/wallet/pending-withdrawals', getPendingWithdrawals);
router.post('/wallet/:id/approve', approveWithdrawal);
router.post('/wallet/:id/reject', rejectWithdrawal);
router.get('/wallet/pending-deposits', getPendingWalletDeposits);
router.post('/wallet/deposits/:id/approve', approveWalletDeposit);
router.post('/wallet/deposits/:id/reject', rejectWalletDeposit);

// KYC management
router.get('/kyc/pending', getPendingKyc);
router.post('/kyc/:userId/approve', approveKyc);
router.post('/kyc/:userId/reject', rejectKyc);

module.exports = router;
