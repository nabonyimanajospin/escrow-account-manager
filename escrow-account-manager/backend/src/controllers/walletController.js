const { User, WalletTransaction } = require('../models');

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balance and summary stats.
 */
const getWallet = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'walletBalance'],
    });
    const pendingWithdrawals = await WalletTransaction.sum('amount', {
      where: { userId: req.user.id, type: 'WITHDRAWAL_REQUEST', status: 'PENDING' },
    });
    const totalEarned = await WalletTransaction.sum('amount', {
      where: { userId: req.user.id, type: 'CREDIT', status: 'COMPLETED' },
    });
    const totalWithdrawn = await WalletTransaction.sum('amount', {
      where: { userId: req.user.id, type: 'WITHDRAWAL_PAID', status: 'COMPLETED' },
    });

    res.json({
      success: true,
      wallet: {
        balance: parseFloat(user.walletBalance || 0),
        pendingWithdrawals: parseFloat(pendingWithdrawals || 0),
        totalEarned: parseFloat(totalEarned || 0),
        totalWithdrawn: parseFloat(totalWithdrawn || 0),
      },
    });
  } catch (err) {
    console.error('[Wallet] getWallet error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet.' });
  }
};

/**
 * GET /api/wallet/history
 * Returns all wallet transactions for the authenticated user.
 */
const getWalletHistory = async (req, res) => {
  try {
    const transactions = await WalletTransaction.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, transactions });
  } catch (err) {
    console.error('[Wallet] getWalletHistory error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet history.' });
  }
};

/**
 * POST /api/wallet/withdraw
 * Body: { amount, notes }
 * Creates a pending withdrawal request; admin approves manually.
 */
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid withdrawal amount is required.' });
    }
    const user = await User.findByPk(req.user.id);
    const requestAmount = parseFloat(amount);
    if (requestAmount > parseFloat(user.walletBalance || 0)) {
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance.' });
    }

    // Deduct from balance immediately and create pending record
    await user.update({ walletBalance: parseFloat(user.walletBalance) - requestAmount });
    const walletTx = await WalletTransaction.create({
      userId: req.user.id,
      type: 'WITHDRAWAL_REQUEST',
      amount: requestAmount,
      notes: notes || '',
      status: 'PENDING',
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Admin will process within 2–3 business days.',
      transaction: walletTx,
      newBalance: parseFloat(user.walletBalance) - requestAmount,
    });
  } catch (err) {
    console.error('[Wallet] requestWithdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal.' });
  }
};

module.exports = { getWallet, getWalletHistory, requestWithdrawal };
