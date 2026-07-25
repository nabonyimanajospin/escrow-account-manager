const path = require('path');
const { User } = require('../models');
const logger = require('../utils/logger');

// @desc    Seller/Buyer submits KYC document for verification
// @route   POST /api/kyc/submit
// @access  Private (BUYER, SELLER)
exports.submitKyc = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a KYC identity document (ID card, passport, or driving license).' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isKycVerified) {
      return res.status(400).json({ success: false, message: 'Your account is already KYC verified.' });
    }

    // Store the uploaded file path on the user record for admin review
    await user.update({ kycDocumentUrl: `/uploads/kyc/${req.file.filename}` });

    res.status(200).json({
      success: true,
      message: 'KYC document submitted successfully. An administrator will review and verify your account within 1-2 business days.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin gets all users pending KYC verification
// @route   GET /api/kyc/pending
// @access  Private (ADMIN)
exports.getPendingKyc = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const pendingUsers = await User.findAll({
      where: {
        isKycVerified: false,
        kycDocumentUrl: { [Op.ne]: null },
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({ success: true, count: pendingUsers.length, data: pendingUsers });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approves a user's KYC
// @route   POST /api/kyc/:userId/approve
// @access  Private (ADMIN)
exports.approveKyc = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isKycVerified) {
      return res.status(400).json({ success: false, message: 'User is already KYC verified.' });
    }

    await user.update({ isKycVerified: true, kycVerifiedAt: new Date() });

    const notificationService = require('../services/notificationService');
    notificationService.createInAppNotification(user.id, 'KYC Approved ✅', 'Your identity has been verified. You now have full platform access.').catch(() => {});
    notificationService.sendEmail(
      user.email,
      '✅ Your EscrowTrust KYC is Approved',
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#10b981;">Identity Verified ✅</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your KYC identity verification has been <strong>approved</strong> by our team. You now have full access to all platform features.</p>
        <p style="color:#888;font-size:13px;">EscrowTrust Platform</p>
      </div>`
    ).catch(() => {});

    res.status(200).json({ success: true, message: `KYC approved for ${user.name}.`, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin rejects a user's KYC
// @route   POST /api/kyc/:userId/reject
// @access  Private (ADMIN)
exports.rejectKyc = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a rejection reason.' });
    }

    const user = await User.findByPk(req.params.userId, { attributes: { exclude: ['password'] } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Clear the document so they can resubmit
    await user.update({ kycDocumentUrl: null });

    const notificationService = require('../services/notificationService');
    notificationService.createInAppNotification(user.id, 'KYC Rejected ❌', `Your KYC submission was rejected. Reason: ${reason}. Please resubmit with a valid document.`).catch(() => {});
    notificationService.sendEmail(
      user.email,
      '❌ EscrowTrust KYC Submission Rejected',
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#ef4444;">KYC Rejected ❌</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your KYC identity document was <strong>rejected</strong> for the following reason:</p>
        <blockquote style="border-left:4px solid #ef4444;padding-left:12px;color:#555;">${reason}</blockquote>
        <p>Please log in and resubmit a clear, valid government-issued identity document.</p>
        <p style="color:#888;font-size:13px;">EscrowTrust Platform</p>
      </div>`
    ).catch(() => {});

    res.status(200).json({ success: true, message: `KYC rejected for ${user.name}. User notified to resubmit.` });
  } catch (error) {
    next(error);
  }
};
