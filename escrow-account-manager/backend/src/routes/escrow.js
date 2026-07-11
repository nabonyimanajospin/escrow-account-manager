const express = require('express');
const router = express.Router();
const {
  getMyTransactions,
  getTransaction,
  initiateTransaction,
  depositFunds,
  cancelTransaction,
  initiateMutation,
  uploadMutationDocument,
  completeMutation,
  verifyConsensusCode,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get user's active/past escrow transactions
router.get('/my', protect, roleCheck('BUYER', 'SELLER', 'ADMIN'), getMyTransactions);

// Get single transaction details
router.get('/:id', protect, getTransaction);

// Initiate transaction (Buy click)
router.post('/initiate', protect, roleCheck('BUYER'), initiateTransaction);

// Submit consensus verification code
router.post('/:id/consensus-verify', protect, verifyConsensusCode);

// Deposit funds (Buyer simulation)
router.post('/:id/deposit', protect, roleCheck('BUYER'), depositFunds);

// Cancel transaction
router.post('/:id/cancel', protect, roleCheck('BUYER'), cancelTransaction);

// Seller starts mutation process
router.post('/:id/initiate-mutation', protect, roleCheck('SELLER'), initiateMutation);

// Seller uploads mutation proof document/image
router.post('/:id/upload-document', protect, roleCheck('SELLER'), uploadMutationDocument);

// Seller/Admin completes mutation
router.post('/:id/complete-mutation', protect, roleCheck('SELLER', 'ADMIN'), completeMutation);

module.exports = router;
