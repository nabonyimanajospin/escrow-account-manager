const express = require('express');
const router = express.Router();
const { chatWithGlobalAI } = require('../controllers/aiController');

// Global AI Co-Pilot chat
router.post('/global-chat', chatWithGlobalAI);

module.exports = router;
