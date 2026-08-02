const express = require('express');
const router = express.Router();
const institutionalSockets = require('../services/institutionalSockets');
const { protect } = require('../middleware/auth');

// @desc    Irembo / RLMA Land Mutation & Title Deed Approval Webhook Socket
// @route   POST /api/integrations/irembo/mutation-webhook
// @access  Public (Secured via Webhook Authorization Secret)
router.post('/irembo/mutation-webhook', async (req, res, next) => {
  try {
    const result = await institutionalSockets.handleIremboMutationWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// @desc    RDB (Rwanda Development Board) Business & Identity KYC Verification Socket
// @route   POST /api/integrations/rdb/kyc-verify
// @access  Private
router.post('/rdb/kyc-verify', protect, async (req, res, next) => {
  try {
    const { nationalId, companyRegNo } = req.body;
    const result = await institutionalSockets.handleRDBKycVerification(req.user.id, nationalId, companyRegNo);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// @desc    MTN Mobile Money / Bank Escrow Payment Settlement Callback Socket
// @route   POST /api/integrations/momo/payment-webhook
// @access  Public (Secured via Signature)
router.post('/momo/payment-webhook', async (req, res, next) => {
  try {
    const result = await institutionalSockets.handlePaymentGatewayCallback(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// @desc    Get Institutional Connection Sockets Health Status
// @route   GET /api/integrations/status
// @access  Public
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    sockets: {
      irembo: { status: 'ONLINE', endpoint: '/api/integrations/irembo/mutation-webhook', gateway: 'Irembo Gov.rw' },
      rlma: { status: 'ONLINE', endpoint: '/api/integrations/irembo/mutation-webhook', authority: 'Rwanda Land Management Authority' },
      rdb: { status: 'ONLINE', endpoint: '/api/integrations/rdb/kyc-verify', institution: 'Rwanda Development Board' },
      momo: { status: 'ONLINE', endpoint: '/api/integrations/momo/payment-webhook', provider: 'MTN Mobile Money / Bank API' },
    },
    timestamp: new Date(),
  });
});

module.exports = router;
