const express = require('express');
const router = express.Router();
const { getRates, convertCurrency } = require('../controllers/currencyController');

// GET /api/currency/rates
router.get('/rates', getRates);

// GET /api/currency/convert?from=RWF&to=USD&amount=500000
router.get('/convert', convertCurrency);

module.exports = router;
