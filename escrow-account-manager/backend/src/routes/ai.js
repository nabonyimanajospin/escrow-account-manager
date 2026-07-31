const express = require('express');
const router = express.Router();
const { chatWithGlobalAI, analyzeDispute } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// Global AI Co-Pilot chat
router.post('/global-chat', chatWithGlobalAI);

// Admin AI Dispute Arbitration
router.post('/analyze-dispute/:id', protect, authorize('ADMIN'), analyzeDispute);

module.exports = router;
