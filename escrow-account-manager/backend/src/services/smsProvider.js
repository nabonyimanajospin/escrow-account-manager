const logger = require('../utils/logger');

/**
 * Normalize phone to E.164-ish format.
 * Rwanda numbers starting with 0 → +250...
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/[\s\-()]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = '+250' + digits.slice(1);
  }
  if (!digits.startsWith('+') && /^\d{10,15}$/.test(digits)) {
    digits = '+' + digits;
  }
  return /^\+[0-9]{10,15}$/.test(digits) ? digits : null;
};

/**
 * Send SMS via configured provider (mock default — logs to server console for demos).
 * Set SMS_PROVIDER=twilio + credentials for live delivery.
 */
const sendSms = async (phone, message) => {
  const to = normalizePhone(phone);
  if (!to) {
    logger.warn('[SMS] Skipped — invalid or missing phone number.');
    return { sent: false, reason: 'invalid_phone' };
  }

  const text = String(message || '').trim().slice(0, 480);
  if (!text) {
    return { sent: false, reason: 'empty_message' };
  }

  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock') {
    logger.info(`[SMS Mock] → ${to}: ${text}`);
    return { sent: true, provider: 'mock', to };
  }

  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_FROM;
    if (!accountSid || !authToken || !from) {
      logger.warn('[SMS] Twilio credentials missing — falling back to mock log.');
      logger.info(`[SMS Mock/Fallback] → ${to}: ${text}`);
      return { sent: true, provider: 'mock-fallback', to };
    }

    try {
      const axios = require('axios');
      const params = new URLSearchParams({ To: to, From: from, Body: text });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params.toString(),
        {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 8000,
        }
      );
      logger.info(`[SMS Twilio] Sent to ${to}`);
      return { sent: true, provider: 'twilio', to };
    } catch (err) {
      logger.error(`[SMS Twilio] Failed for ${to}:`, err.response?.data?.message || err.message);
      return { sent: false, reason: 'twilio_error' };
    }
  }

  logger.warn(`[SMS] Unknown provider "${provider}" — mock log only.`);
  logger.info(`[SMS Mock] → ${to}: ${text}`);
  return { sent: true, provider: 'mock', to };
};

/** Fire-and-forget SMS (never blocks API responses). */
const sendSmsAsync = (phone, message) => {
  setImmediate(() => {
    sendSms(phone, message).catch((err) => logger.error('[SMS] Async send error:', err.message));
  });
};

module.exports = { sendSms, sendSmsAsync, normalizePhone };
