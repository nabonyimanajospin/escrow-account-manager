const { User, WalletTransaction } = require('../models');
const sequelize = require('../config/database');

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
  const t = await sequelize.transaction();
  try {
    const { amount, notes } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Valid withdrawal amount is required.' });
    }
    
    // Fetch user with lock to prevent race conditions
    const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    const requestAmount = parseFloat(amount);
    if (requestAmount > parseFloat(user.walletBalance || 0)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance.' });
    }

    const newBalance = parseFloat(user.walletBalance) - requestAmount;
    await user.update({ walletBalance: newBalance }, { transaction: t });
    
    const walletTx = await WalletTransaction.create({
      userId: req.user.id,
      type: 'WITHDRAWAL_REQUEST',
      amount: requestAmount,
      notes: notes || '',
      status: 'PENDING',
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Admin will process within 2–3 business days.',
      transaction: walletTx,
      newBalance,
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('[Wallet] requestWithdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal.' });
  }
};

/**
 * POST /api/wallet/:id/approve (Admin)
 */
const approveWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const walletTx = await WalletTransaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!walletTx || walletTx.type !== 'WITHDRAWAL_REQUEST' || walletTx.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Invalid or already processed withdrawal request.' });
    }

    await walletTx.update({ status: 'COMPLETED', type: 'WITHDRAWAL_PAID' }, { transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Withdrawal approved.' });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('[Wallet] approve error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve.' });
  }
};

/**
 * POST /api/wallet/:id/reject (Admin)
 */
const rejectWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const walletTx = await WalletTransaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!walletTx || walletTx.type !== 'WITHDRAWAL_REQUEST' || walletTx.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Invalid or already processed withdrawal request.' });
    }

    // Refund the user
    const user = await User.findByPk(walletTx.userId, { transaction: t, lock: t.LOCK.UPDATE });
    await user.update({ walletBalance: parseFloat(user.walletBalance || 0) + parseFloat(walletTx.amount) }, { transaction: t });
    
    await walletTx.update({ status: 'FAILED' }, { transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Withdrawal rejected and funds refunded.' });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('[Wallet] reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject.' });
  }
};

module.exports = { getWallet, getWalletHistory, requestWithdrawal, approveWithdrawal, rejectWithdrawal };
