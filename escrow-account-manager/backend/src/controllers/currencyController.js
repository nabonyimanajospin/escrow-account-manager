const axios = require('axios');

/**
 * GET /api/currency/rates
 * Returns current USD base rates including RWF.
 * Uses frankfurter.app — completely free, no API key needed.
 */
const getRates = async (req, res) => {
  try {
    const response = await axios.get('https://api.frankfurter.app/latest?from=USD&to=RWF,EUR,GBP,KES,UGX,TZS,NGN');
    const { rates, date } = response.data;
    res.json({
      success: true,
      base: 'USD',
      date,
      rates,
    });
  } catch (err) {
    console.error('[Currency] Rate fetch failed:', err.message);
    // Fallback rate if API is unreachable
    res.json({
      success: true,
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: { RWF: 1360, EUR: 0.92, GBP: 0.79, KES: 130, UGX: 3750, TZS: 2640, NGN: 1580 },
      fallback: true,
    });
  }
};

/**
 * GET /api/currency/convert?from=RWF&to=USD&amount=500000
 * Converts between any two supported currencies.
 */
const convertCurrency = async (req, res) => {
  const { from = 'RWF', to = 'USD', amount } = req.query;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'Valid amount is required.' });
  }
  try {
    const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
    const response = await axios.get(url);
    const rate = response.data.rates[to];
    const converted = (parseFloat(amount) * rate).toFixed(2);
    res.json({
      success: true,
      from,
      to,
      amount: parseFloat(amount),
      rate,
      result: parseFloat(converted),
      date: response.data.date,
    });
  } catch (err) {
    console.error('[Currency] Convert failed:', err.message);
    // Fallback
    const fallbackRates = { RWF: 1360, EUR: 0.92, GBP: 0.79 };
    const fallbackUSD = parseFloat(amount) / (fallbackRates[from] || 1);
    res.json({
      success: true,
      from,
      to,
      amount: parseFloat(amount),
      rate: 1 / (fallbackRates[from] || 1),
      result: parseFloat(fallbackUSD.toFixed(2)),
      fallback: true,
    });
  }
};

module.exports = { getRates, convertCurrency };
