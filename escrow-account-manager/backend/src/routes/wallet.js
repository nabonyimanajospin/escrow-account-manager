const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getWallet,
  requestWithdrawal,
  getWalletHistory,
} = require('../controllers/walletController');

// All wallet routes require authentication
router.use(protect);

// GET  /api/wallet          — get current balance + summary
router.get('/', getWallet);

// GET  /api/wallet/history  — full transaction history
router.get('/history', getWalletHistory);

// POST /api/wallet/withdraw — request a withdrawal
router.post('/withdraw', requestWithdrawal);

module.exports = router;
