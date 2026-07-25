const express = require('express');
const router = express.Router();
const { submitKyc, getPendingKyc, approveKyc, rejectKyc } = require('../controllers/kycController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { uploadKyc } = require('../middleware/upload');

// Submit KYC document (any authenticated user)
router.post('/submit', protect, uploadKyc, submitKyc);

// Admin routes
router.get('/pending', protect, roleCheck('ADMIN'), getPendingKyc);
router.post('/:userId/approve', protect, roleCheck('ADMIN'), approveKyc);
router.post('/:userId/reject', protect, roleCheck('ADMIN'), rejectKyc);

module.exports = router;
