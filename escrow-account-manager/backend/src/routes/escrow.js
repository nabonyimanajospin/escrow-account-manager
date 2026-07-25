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
  confirmReceipt,
  confirmPropertyReceipt,
  verifyRegistryDeed,
} = require('../controllers/transactionController');
const { raiseDispute, uploadEvidence, resolveDispute, mediateDispute } = require('../controllers/disputeController');
const { acceptOffer } = require('../controllers/offerController');
const { chatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { uploadEvidence: uploadEvidenceFile, uploadMutationDoc } = require('../middleware/upload');

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

// Raise dispute
router.post('/:id/dispute', protect, roleCheck('BUYER', 'SELLER'), raiseDispute);

// Upload evidence for dispute (supports real file upload OR url string)
router.post('/:id/dispute/evidence', protect, roleCheck('BUYER', 'SELLER'), uploadEvidenceFile, uploadEvidence);

// Resolve dispute (Admin)
router.post('/:id/dispute/resolve', protect, roleCheck('ADMIN'), resolveDispute);

// Initiate active mediation (Admin)
router.post('/:id/dispute/mediate', protect, roleCheck('ADMIN'), mediateDispute);

// Confirm receipt of funds (Seller)
router.post('/:id/confirm-receipt', protect, roleCheck('SELLER'), confirmReceipt);

// Confirm receipt of property/deed (Buyer)
router.post('/:id/confirm-property-receipt', protect, roleCheck('BUYER'), confirmPropertyReceipt);

// Verify deed document with Land Registry API simulation
router.post('/:id/verify-registry', protect, verifyRegistryDeed);

// AI Co-Pilot chat
router.post('/:id/ai-chat', protect, chatWithAI);

// Offer acceptance route
router.post('/offers/:id/accept', protect, roleCheck('SELLER'), acceptOffer);

// AI document analysis
const { analyzeTransactionDocument, getDocumentAnalysisReport } = require('../controllers/documentAnalysisController');

// Trigger AI analysis on the latest uploaded mutation document
router.post('/:id/analyze-document', protect, roleCheck('SELLER', 'ADMIN'), analyzeTransactionDocument);

// Get stored AI analysis report
router.get('/:id/document-analysis', protect, getDocumentAnalysisReport);

module.exports = router;
