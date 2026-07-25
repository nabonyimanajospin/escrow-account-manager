const nodemailer = require('nodemailer');
const { Notification } = require('../models');
const logger = require('../utils/logger');

/**
 * Nodemailer transporter configured for Gmail SMTP.
 * Uses App Password authentication (no OAuth required).
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

/**
 * Send a plain-text / HTML email.
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} html     - HTML body content
 * @param {string} text     - Fallback plain-text content
 */
const sendEmail = async (to, subject, html, text = '') => {
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_APP_PASSWORD) {
    logger.warn('[Email] EMAIL_FROM or EMAIL_APP_PASSWORD not set — skipping email send.');
    return;
  }

  const mailOptions = {
    from: `"EscrowTrust Platform" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[Email] Sent to ${to} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`[Email] Failed to send to ${to}:`, err.message);
    // Do not throw — email failure should not crash the API
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification helpers
// ─────────────────────────────────────────────────────────────────────────────

const createInAppNotification = async (userId, title, message) => {
  try {
    await Notification.create({ userId, title, message });
  } catch (err) {
    logger.error('[Notification] Failed to create in-app notification:', err.message);
  }
};

const sendOtpEmail = async (toEmail, toName, otpCode, transactionRef) => {
  const subject = `Your EscrowTrust OTP Code — ${transactionRef}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a2e;padding:24px 32px;">
        <h1 style="color:#c8a96e;margin:0;font-size:22px;">🔐 EscrowTrust</h1>
        <p style="color:#aaa;margin:4px 0 0;font-size:13px;">Secure Property Escrow Platform</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;font-size:16px;">Hello <strong>${toName}</strong>,</p>
        <p style="color:#555;">Your one-time approval code for transaction <strong>${transactionRef}</strong> is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#f3f4f6;border:2px dashed #c8a96e;border-radius:8px;padding:16px 40px;font-size:36px;font-weight:bold;letter-spacing:10px;color:#1a1a2e;">${otpCode}</span>
        </div>
        <p style="color:#888;font-size:13px;">⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">If you did not request this code, please contact our support immediately at <a href="mailto:${process.env.EMAIL_FROM}">${process.env.EMAIL_FROM}</a>.</p>
      </div>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
};

const sendTransactionStatusEmail = async (toEmail, toName, status, transactionRef, amount) => {
  const statusMap = {
    FUNDED: { emoji: '💰', label: 'Funds Deposited', color: '#10b981', msg: `Your deposit of <strong>$${amount}</strong> has been received and is now held securely in escrow.` },
    COMPLETED: { emoji: '✅', label: 'Transaction Completed', color: '#10b981', msg: `Funds have been released and the transaction is now complete. Thank you for using EscrowTrust.` },
    DISPUTED: { emoji: '⚠️', label: 'Dispute Filed', color: '#f59e0b', msg: `A dispute has been opened on transaction <strong>${transactionRef}</strong>. Our team will review the case.` },
    REFUNDED: { emoji: '↩️', label: 'Refund Initiated', color: '#3b82f6', msg: `A refund of <strong>$${amount}</strong> has been initiated back to the buyer.` },
  };
  const info = statusMap[status] || { emoji: '📋', label: status, color: '#6b7280', msg: `Your transaction status has been updated to ${status}.` };

  const subject = `${info.emoji} EscrowTrust: ${info.label} — ${transactionRef}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a2e;padding:24px 32px;">
        <h1 style="color:#c8a96e;margin:0;font-size:22px;">🏠 EscrowTrust</h1>
      </div>
      <div style="padding:32px;">
        <div style="background:${info.color}18;border-left:4px solid ${info.color};border-radius:4px;padding:16px;margin-bottom:24px;">
          <p style="color:${info.color};font-weight:bold;margin:0;font-size:18px;">${info.emoji} ${info.label}</p>
        </div>
        <p style="color:#333;">Hello <strong>${toName}</strong>,</p>
        <p style="color:#555;">${info.msg}</p>
        <p style="color:#888;font-size:13px;">Transaction Reference: <strong>${transactionRef}</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">EscrowTrust Platform — Secure Property Transactions</p>
      </div>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
};

const sendDisputeNotificationEmail = async (toEmail, toName, transactionRef, role) => {
  const subject = `⚠️ Dispute Filed — Transaction ${transactionRef}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a2e;padding:24px 32px;">
        <h1 style="color:#c8a96e;margin:0;font-size:22px;">⚠️ EscrowTrust</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;">Hello <strong>${toName}</strong>,</p>
        <p style="color:#555;">A dispute has been filed on transaction <strong>${transactionRef}</strong> where you are the <strong>${role}</strong>.</p>
        <p style="color:#555;">Please log in to EscrowTrust to submit your evidence and review the case details.</p>
        <p style="color:#888;font-size:13px;">Our mediation team will review the case within 7 business days.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">EscrowTrust Platform — Secure Property Transactions</p>
      </div>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
};

const sendWalletCreditEmail = async (toEmail, toName, amount, newBalance, transactionRef) => {
  const subject = `💰 Wallet Credited — $${amount} Received`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a2e;padding:24px 32px;">
        <h1 style="color:#c8a96e;margin:0;font-size:22px;">💰 EscrowTrust Wallet</h1>
      </div>
      <div style="padding:32px;">
        <p style="color:#333;">Hello <strong>${toName}</strong>,</p>
        <p style="color:#555;">Escrow funds have been released to your wallet for transaction <strong>${transactionRef}</strong>.</p>
        <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:4px;padding:16px;margin:20px 0;">
          <p style="color:#10b981;font-weight:bold;margin:0;font-size:20px;">+ $${Number(amount).toFixed(2)} credited</p>
          <p style="color:#555;margin:4px 0 0;font-size:13px;">New wallet balance: <strong>$${Number(newBalance).toFixed(2)}</strong></p>
        </div>
        <p style="color:#888;font-size:13px;">You can request a withdrawal from your seller wallet dashboard.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#aaa;font-size:12px;">EscrowTrust Platform — Secure Property Transactions</p>
      </div>
    </div>
  `;
  return sendEmail(toEmail, subject, html);
};

/**
 * sendConsensusCode — called by transactionController when OTP is issued.
 * { user, transaction, code, expiresAt }
 */
const sendConsensusCode = async ({ user, transaction, code, expiresAt }) => {
  const ref = transaction.reference || `TXN-${transaction.id}`;
  return sendOtpEmail(user.email, user.name, code, ref);
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendTransactionStatusEmail,
  sendDisputeNotificationEmail,
  sendWalletCreditEmail,
  sendConsensusCode,
  createInAppNotification,
};
