const { Op } = require('sequelize');
const { User, WalletTransaction, Escrow, Transaction, LedgerEntry } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

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

    const totalDeposited = await WalletTransaction.sum('amount', {
      where: { userId: req.user.id, type: 'DEPOSIT', status: 'COMPLETED' },
    });

    res.json({
      success: true,
      wallet: {
        balance: parseFloat(user.walletBalance || 0),
        pendingWithdrawals: parseFloat(pendingWithdrawals || 0),
        totalEarned: parseFloat(totalEarned || 0),
        totalWithdrawn: parseFloat(totalWithdrawn || 0),
        totalDeposited: parseFloat(totalDeposited || 0),
      },
    });
  } catch (err) {
    logger.error('[Wallet] getWallet error:', err);
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
    logger.error('[Wallet] getWalletHistory error:', err);
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
    logger.error('[Wallet] requestWithdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal.' });
  }
};

/**
 * POST /api/wallet/deposit-request
 * Buyer submits proof of external payment (MoMo/bank). Admin verifies and credits wallet.
 * Body: { amount, paymentReference, notes, paymentMethod }
 */
const requestWalletDeposit = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, paymentReference, notes, paymentMethod } = req.body;
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Valid deposit amount is required.' });
    }
    if (!paymentReference || !String(paymentReference).trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Payment reference (MoMo/bank transaction ID) is required.' });
    }

    const ref = String(paymentReference).trim();
    const duplicate = await WalletTransaction.findOne({
      where: { reference: ref, type: 'DEPOSIT_REQUEST' },
      transaction: t,
    });
    if (duplicate) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'This payment reference was already submitted.' });
    }

    const walletTx = await WalletTransaction.create({
      userId: req.user.id,
      type: 'DEPOSIT_REQUEST',
      amount: depositAmount,
      reference: ref,
      notes: [paymentMethod, notes].filter(Boolean).join(' — ') || 'Wallet funding request',
      status: 'PENDING',
    }, { transaction: t });

    await t.commit();

    notificationService.createInAppNotification(
      req.user.id,
      'Deposit request submitted',
      `Your wallet funding request for $${depositAmount.toLocaleString()} is pending admin verification.`
    ).catch(() => {});

    notificationService.notifyAdmins(
      'Wallet funding request',
      `${req.user.name} requested a wallet deposit of $${depositAmount.toLocaleString()} (ref: ${ref}). Review Admin → Wallet to approve or reject.`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted. Funds will be credited after admin verifies your payment reference.',
      transaction: walletTx,
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    logger.error('[Wallet] requestWalletDeposit error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit deposit request.' });
  }
};

/**
 * GET /api/admin/wallet/pending-deposits
 */
const getPendingWalletDeposits = async (req, res) => {
  try {
    const deposits = await WalletTransaction.findAll({
      where: { type: 'DEPOSIT_REQUEST', status: 'PENDING' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: deposits });
  } catch (err) {
    logger.error('[Wallet] getPendingWalletDeposits error:', err);
    res.status(500).json({ success: false, error: 'Failed to load pending deposits.' });
  }
};

/**
 * POST /api/admin/wallet/deposits/:id/approve
 */
const approveWalletDeposit = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const walletTx = await WalletTransaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!walletTx || walletTx.type !== 'DEPOSIT_REQUEST' || walletTx.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Invalid or already processed deposit request.' });
    }

    const user = await User.findByPk(walletTx.userId, { transaction: t, lock: t.LOCK.UPDATE });
    const newBalance = parseFloat(user.walletBalance || 0) + parseFloat(walletTx.amount);
    await user.update({ walletBalance: newBalance }, { transaction: t });

    await walletTx.update({ status: 'COMPLETED', type: 'DEPOSIT' }, { transaction: t });

    await t.commit();

    notificationService.createInAppNotification(
      user.id,
      'Wallet funded',
      `$${parseFloat(walletTx.amount).toLocaleString()} has been credited to your wallet. New balance: $${newBalance.toLocaleString()}.`
    ).catch(() => {});

    res.json({ success: true, message: 'Deposit approved and wallet credited.', newBalance });
  } catch (error) {
    if (!t.finished) await t.rollback();
    logger.error('[Wallet] approveWalletDeposit error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve deposit.' });
  }
};

/**
 * POST /api/admin/wallet/deposits/:id/reject
 */
const rejectWalletDeposit = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const walletTx = await WalletTransaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!walletTx || walletTx.type !== 'DEPOSIT_REQUEST' || walletTx.status !== 'PENDING') {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Invalid or already processed deposit request.' });
    }

    await walletTx.update({
      status: 'REJECTED',
      notes: `${walletTx.notes || ''}${reason ? ` — Rejected: ${reason}` : ''}`.trim(),
    }, { transaction: t });

    await t.commit();

    notificationService.createInAppNotification(
      walletTx.userId,
      'Deposit request rejected',
      reason || 'Your wallet funding request could not be verified. Contact support with your payment reference.'
    ).catch(() => {});

    res.json({ success: true, message: 'Deposit request rejected.' });
  } catch (error) {
    if (!t.finished) await t.rollback();
    logger.error('[Wallet] rejectWalletDeposit error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject deposit.' });
  }
};

/**
 * GET /api/admin/wallet/pending-withdrawals
 * Lists seller withdrawal requests awaiting admin payout.
 */
const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await WalletTransaction.findAll({
      where: { type: 'WITHDRAWAL_REQUEST', status: 'PENDING' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'walletBalance'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    logger.error('[Wallet] getPendingWithdrawals error:', err);
    res.status(500).json({ success: false, error: 'Failed to load pending withdrawals.' });
  }
};

/**
 * POST /api/wallet/:id/approve (Admin) — withdrawal
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
    logger.error('[Wallet] approve error:', error);
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
    
    await walletTx.update({ status: 'REJECTED' }, { transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Withdrawal rejected and funds refunded.' });
  } catch (error) {
    if (!t.finished) await t.rollback();
    logger.error('[Wallet] reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject.' });
  }
};

/**
 * GET /api/admin/platform-summary
 * Platform-wide treasury snapshot for admin dashboard.
 */
const getPlatformSummary = async (req, res) => {
  try {
    const [
      totalEscrowLocked,
      platformRevenue,
      totalUserWalletBalances,
      pendingDepositAmount,
      pendingDepositCount,
      pendingWithdrawalAmount,
      pendingWithdrawalCount,
      activeEscrowAccounts,
      completedDeals,
    ] = await Promise.all([
      Escrow.sum('balance', { where: { status: 'ACTIVE' } }),
      LedgerEntry.sum('amount', { where: { accountType: 'PLATFORM_REVENUE', type: 'CREDIT' } }),
      User.sum('walletBalance'),
      WalletTransaction.sum('amount', { where: { type: 'DEPOSIT_REQUEST', status: 'PENDING' } }),
      WalletTransaction.count({ where: { type: 'DEPOSIT_REQUEST', status: 'PENDING' } }),
      WalletTransaction.sum('amount', { where: { type: 'WITHDRAWAL_REQUEST', status: 'PENDING' } }),
      WalletTransaction.count({ where: { type: 'WITHDRAWAL_REQUEST', status: 'PENDING' } }),
      Escrow.count({ where: { status: 'ACTIVE', balance: { [Op.gt]: 0 } } }),
      Transaction.count({ where: { status: 'COMPLETED' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalEscrowLocked: parseFloat(totalEscrowLocked || 0),
        platformRevenue: parseFloat(platformRevenue || 0),
        totalUserWalletBalances: parseFloat(totalUserWalletBalances || 0),
        pendingDepositAmount: parseFloat(pendingDepositAmount || 0),
        pendingDepositCount: pendingDepositCount || 0,
        pendingWithdrawalAmount: parseFloat(pendingWithdrawalAmount || 0),
        pendingWithdrawalCount: pendingWithdrawalCount || 0,
        activeEscrowAccounts: activeEscrowAccounts || 0,
        completedDeals: completedDeals || 0,
      },
    });
  } catch (err) {
    logger.error('[Wallet] getPlatformSummary error:', err);
    res.status(500).json({ success: false, error: 'Failed to load platform summary.' });
  }
};

module.exports = {
  getWallet,
  getWalletHistory,
  requestWithdrawal,
  requestWalletDeposit,
  getPendingWalletDeposits,
  approveWalletDeposit,
  rejectWalletDeposit,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getPlatformSummary,
};
