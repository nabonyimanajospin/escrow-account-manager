const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const requireKyc = require('../middleware/kycRequired');
const {
  getWallet,
  requestWithdrawal,
  getWalletHistory,
  requestWalletDeposit,
} = require('../controllers/walletController');

const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many withdrawal requests. Please wait 1 hour.' },
});

// All wallet routes require authentication
router.use(protect);

// GET  /api/wallet          — get current balance + summary
router.get('/', getWallet);

// GET  /api/wallet/history  — full transaction history
router.get('/history', getWalletHistory);

// POST /api/wallet/withdraw — request a withdrawal (rate limited: 5/hour)
router.post('/withdraw', requireKyc, withdrawalLimiter, requestWithdrawal);

const depositLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many deposit requests. Please wait before submitting again.' },
});

// POST /api/wallet/deposit-request — submit MoMo/bank funding proof (admin verifies)
router.post('/deposit-request', requireKyc, depositLimiter, requestWalletDeposit);

module.exports = router;
