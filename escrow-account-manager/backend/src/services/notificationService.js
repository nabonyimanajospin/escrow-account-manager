const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');
const logger = require('../utils/logger');
const { sendSmsAsync } = require('./smsProvider');

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
  connectionTimeout: 2500,
  greetingTimeout: 2500,
  socketTimeout: 2500,
});

const defaultNoticeHtml = (userName, title, message) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#1a1a2e;padding:24px 32px;">
      <h1 style="color:#c8a96e;margin:0;font-size:22px;">🏠 EscrowTrust</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#333;">Hello <strong>${userName}</strong>,</p>
      <p style="color:#1e293b;font-weight:bold;font-size:16px;margin-bottom:12px;">${title}</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;">${message}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#aaa;font-size:12px;">EscrowTrust Platform — Real-Time Notification Notice</p>
    </div>
  </div>
`;

const smsFromNotice = (title, message) => {
  const plain = `${title}: ${message}`.replace(/\s+/g, ' ').trim();
  return `[EscrowTrust] ${plain}`.slice(0, 480);
};

/**
 * Send a plain-text / HTML email (fire-and-forget).
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

  setImmediate(() => {
    transporter.sendMail(mailOptions)
      .then((info) => logger.info(`[Email] Sent to ${to} — MessageId: ${info?.messageId}`))
      .catch((err) => logger.error(`[Email] Failed to send to ${to}:`, err.message));
  });
};

/**
 * Tri-channel dispatch: in-app bell + email + SMS (when phone on file).
 * Existing callers keep working — SMS is additive only.
 */
const notifyUserTriChannel = async (userOrId, title, message, options = {}) => {
  try {
    const user = typeof userOrId === 'object' && userOrId !== null
      ? userOrId
      : await User.findByPk(userOrId, { attributes: ['id', 'name', 'email', 'phone'] });

    if (!user) {
      logger.warn('[Notification] notifyUserTriChannel — user not found');
      return;
    }

    const { skipInApp = false, skipEmail = false, skipSms = false, emailSubject, emailHtml, smsText } = options;

    if (!skipInApp) {
      await Notification.create({ userId: user.id, title, message });
    }

    if (!skipEmail && user.email) {
      const subject = emailSubject || `🔔 EscrowTrust Notice: ${title}`;
      const html = emailHtml || defaultNoticeHtml(user.name, title, message);
      sendEmail(user.email, subject, html).catch((e) => logger.warn(`[Notification Email] ${e.message}`));
    }

    if (!skipSms && user.phone) {
      sendSmsAsync(user.phone, smsText || smsFromNotice(title, message));
    } else if (!skipSms && !user.phone) {
      logger.debug(`[SMS] No phone on file for user ${user.id} — in-app + email only`);
    }
  } catch (err) {
    logger.error('[Notification] notifyUserTriChannel failed:', err.message);
  }
};

/** @deprecated name kept for backward compatibility — now sends all 3 channels */
const createInAppNotification = async (userId, title, message, options = {}) => {
  return notifyUserTriChannel(userId, title, message, options);
};

const sendOtpEmail = async (toEmail, toName, otpCode, transactionRef, options = {}) => {
  const opts = typeof options === 'string' ? { phone: options } : options;
  const { phone, userId, skipSms = false, skipInApp = false } = opts;

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

  sendEmail(toEmail, subject, html);

  const otpTitle = '🔐 Verification Approval Code';
  const otpMessage = `Your verification code for ${transactionRef} is: ${otpCode}. Expires in 10 minutes.`;

  if (userId && !skipInApp) {
    await Notification.create({ userId, title: otpTitle, message: otpMessage });
  }

  if (phone && !skipSms) {
    sendSmsAsync(phone, `[EscrowTrust] OTP ${transactionRef}: ${otpCode}. Valid 10 min. Do not share.`);
  }

  return Promise.resolve();
};

const sendTransactionStatusEmail = async (toEmail, toName, status, transactionRef, amount, phone = null) => {
  const statusMap = {
    FUNDED: { emoji: '💰', label: 'Funds Deposited', color: '#10b981', msg: `Your deposit of $${amount} has been received and is now held securely in escrow.` },
    MUTATION_STARTED: { emoji: '🏗️', label: 'Mutation Started', color: '#3b82f6', msg: 'The seller has started the property ownership transfer process.' },
    UNDER_REVIEW: { emoji: '🔍', label: 'Under Admin Review', color: '#8b5cf6', msg: 'Property transfer documents are being verified by administration.' },
    COMPLETED: { emoji: '✅', label: 'Transaction Completed', color: '#10b981', msg: 'Funds have been released and the transaction is now complete. Thank you for using EscrowTrust.' },
    DISPUTED: { emoji: '⚠️', label: 'Dispute Filed', color: '#f59e0b', msg: `A dispute has been opened on transaction ${transactionRef}. Our team will review the case.` },
    REFUNDED: { emoji: '↩️', label: 'Refund Initiated', color: '#3b82f6', msg: `A refund of $${amount} has been initiated back to the buyer.` },
    CANCELLED: { emoji: '❌', label: 'Transaction Cancelled', color: '#6b7280', msg: `Transaction ${transactionRef} has been cancelled.` },
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

  sendEmail(toEmail, subject, html);

  if (phone) {
    sendSmsAsync(phone, `[EscrowTrust] ${info.label} (${transactionRef}). ${info.msg}`.slice(0, 480));
  }

  return Promise.resolve();
};

const sendDisputeNotificationEmail = async (toEmail, toName, transactionRef, role, phone = null) => {
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

  sendEmail(toEmail, subject, html);

  if (phone) {
    sendSmsAsync(phone, `[EscrowTrust] Dispute filed on ${transactionRef} (you are ${role}). Log in to submit evidence.`.slice(0, 480));
  }

  return Promise.resolve();
};

const sendWalletCreditEmail = async (toEmail, toName, amount, newBalance, transactionRef, phone = null, userId = null) => {
  const title = '💰 Wallet Credited';
  const message = `+$${Number(amount).toFixed(2)} released to your wallet for ${transactionRef}. New balance: $${Number(newBalance).toFixed(2)}.`;

  if (userId) {
    try {
      await Notification.create({ userId, title, message });
    } catch (err) {
      logger.error('[Notification] Wallet credit in-app failed:', err.message);
    }
  }

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

  sendEmail(toEmail, subject, html);

  if (phone) {
    sendSmsAsync(phone, `[EscrowTrust] Wallet credited +$${Number(amount).toFixed(2)} for ${transactionRef}. Balance: $${Number(newBalance).toFixed(2)}.`.slice(0, 480));
  }

  return Promise.resolve();
};

/**
 * sendConsensusCode — OTP to buyer/seller: in-app + email + SMS together.
 */
const sendConsensusCode = async ({ user, transaction, code, expiresAt }) => {
  const ref = transaction.reference || transaction.transactionId || `TXN-${transaction.id}`;

  await notifyUserTriChannel(user, '🔐 Verification Approval Code', `Your verification approval code for deal ${ref} is: ${code}`, {
    skipEmail: true,
    smsText: `[EscrowTrust] Deal ${ref} — your approval code is ${code}. Expires in 10 min.`,
  });

  return sendOtpEmail(user.email, user.name, code, ref, { phone: user.phone, skipSms: true, skipInApp: true });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendTransactionStatusEmail,
  sendDisputeNotificationEmail,
  sendWalletCreditEmail,
  sendConsensusCode,
  createInAppNotification,
  notifyUserTriChannel,
};
