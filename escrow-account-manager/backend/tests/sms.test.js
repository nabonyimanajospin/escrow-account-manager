/**
 * SMS provider unit tests
 */
const { sendSms, normalizePhone } = require('../src/services/smsProvider');

describe('smsProvider', () => {
  it('normalizes Rwanda local numbers to +250', () => {
    expect(normalizePhone('0788123456')).toBe('+250788123456');
  });

  it('mock send succeeds without credentials', async () => {
    process.env.SMS_PROVIDER = 'mock';
    const result = await sendSms('+250788123456', 'Test message');
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('rejects invalid phone', async () => {
    const result = await sendSms('abc', 'Test');
    expect(result.sent).toBe(false);
  });
});
