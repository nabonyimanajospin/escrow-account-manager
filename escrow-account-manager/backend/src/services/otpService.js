const crypto = require('crypto');

const OTP_TTL_MINUTES = Number(process.env.CONSENSUS_OTP_TTL_MINUTES || 10);

const hashCode = (code, salt) => crypto
  .createHash('sha256')
  .update(`${salt}:${code}`)
  .digest('hex');

const generateCode = () => crypto.randomInt(1000, 10000).toString();

const issueConsensusCode = async (transaction, dbTransaction) => {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await transaction.update({
    verificationCode: null,
    verificationCodeHash: hashCode(code, salt),
    verificationCodeSalt: salt,
    verificationCodeExpiresAt: expiresAt,
    verificationAttempts: 0,
    verificationLockedUntil: null,
  }, { transaction: dbTransaction });

  return { code, expiresAt };
};

const verifyConsensusCode = (transaction, code) => {
  if (!transaction.verificationCodeHash || !transaction.verificationCodeSalt) {
    return false;
  }

  if (transaction.verificationCodeExpiresAt && new Date(transaction.verificationCodeExpiresAt) < new Date()) {
    return false;
  }

  return hashCode(String(code), transaction.verificationCodeSalt) === transaction.verificationCodeHash;
};

module.exports = {
  issueConsensusCode,
  verifyConsensusCode,
};
