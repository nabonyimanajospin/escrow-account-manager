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
  resendOtp,
  getAccountingJournal,
  exportAccountingJournalCsv,
  explainContractClause,
  verifyContractByChecksum,
  getMyGlobalJournal,
  exportMyGlobalJournalCsv,
  requestLockExtension,
  respondLockExtension,
} = require('../controllers/transactionController');
const { generateProtectedPdf } = require('../controllers/pdfController');
const { raiseDispute, uploadEvidence, resolveDispute, mediateDispute } = require('../controllers/disputeController');

const { acceptOffer } = require('../controllers/offerController');
const { chatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const requireKyc = require('../middleware/kycRequired');
const { uploadEvidence: uploadEvidenceFile, uploadMutationDoc } = require('../middleware/upload');

// Public contract verification route
router.get('/verify-deed/:checksum', verifyContractByChecksum);

// Platform-wide global accounting journal
router.get('/my-global-journal', protect, getMyGlobalJournal);
router.get('/my-global-journal/export', protect, exportMyGlobalJournalCsv);

// Get user's active/past escrow transactions
router.get('/my', protect, roleCheck('BUYER', 'SELLER', 'ADMIN'), getMyTransactions);

// Explain highlighted contract clause with AI
router.post('/contract/explain', protect, explainContractClause);

// Get transaction accounting journal & export CSV
router.get('/:id/journal', protect, getAccountingJournal);
router.get('/:id/journal/export', protect, exportAccountingJournalCsv);

// Get single transaction details
router.get('/:id', protect, getTransaction);

// Initiate transaction (Buy click)
router.post('/initiate', protect, roleCheck('BUYER'), requireKyc, initiateTransaction);

// Submit consensus verification code
router.post('/:id/consensus-verify', protect, verifyConsensusCode);

// Resend OTP verification code to current requesting user
router.post('/:id/resend-otp', protect, resendOtp);

// Deposit funds (Buyer simulation)
router.post('/:id/deposit', protect, roleCheck('BUYER'), requireKyc, depositFunds);

// Cancel transaction
router.post('/:id/cancel', protect, roleCheck('BUYER'), cancelTransaction);

// Seller starts mutation process
router.post('/:id/initiate-mutation', protect, roleCheck('SELLER'), requireKyc, initiateMutation);

// Seller uploads mutation proof document/image (URL string)
router.post('/:id/upload-document', protect, roleCheck('SELLER'), requireKyc, uploadMutationDocument);

// Seller uploads mutation proof via real file (multipart)
router.post('/:id/upload-mutation-file', protect, roleCheck('SELLER'), requireKyc, uploadMutationDoc, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const { description } = req.body;
    req.body.documentUrl = `/uploads/mutations/${req.file.filename}`;
    req.body.description = description || req.file.originalname;
    return uploadMutationDocument(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Seller/Admin completes mutation
router.post('/:id/complete-mutation', protect, roleCheck('SELLER', 'ADMIN'), requireKyc, completeMutation);

// Raise dispute
router.post('/:id/dispute', protect, roleCheck('BUYER', 'SELLER'), requireKyc, raiseDispute);

// Upload evidence for dispute (supports real file upload OR url string)
router.post('/:id/dispute/evidence', protect, roleCheck('BUYER', 'SELLER'), requireKyc, uploadEvidenceFile, uploadEvidence);

// Resolve dispute (Admin)
router.post('/:id/dispute/resolve', protect, roleCheck('ADMIN'), resolveDispute);

// Initiate active mediation (Admin)
router.post('/:id/dispute/mediate', protect, roleCheck('ADMIN'), mediateDispute);

// Confirm receipt of funds (Seller)
router.post('/:id/confirm-receipt', protect, roleCheck('SELLER'), requireKyc, confirmReceipt);

// Confirm receipt of property/deed (Buyer)
router.post('/:id/confirm-property-receipt', protect, roleCheck('BUYER'), requireKyc, confirmPropertyReceipt);

// Verify deed document with Land Registry API simulation
router.post('/:id/verify-registry', protect, verifyRegistryDeed);

// AI Co-Pilot chat
router.post('/:id/ai-chat', protect, chatWithAI);

// Offer acceptance route
router.post('/offers/:id/accept', protect, roleCheck('SELLER'), requireKyc, acceptOffer);

// AI document analysis
const { analyzeTransactionDocument, getDocumentAnalysisReport } = require('../controllers/documentAnalysisController');

// Trigger AI analysis on the latest uploaded mutation document
router.post('/:id/analyze-document', protect, roleCheck('SELLER', 'ADMIN'), analyzeTransactionDocument);

// Get stored AI analysis report
router.get('/:id/document-analysis', protect, getDocumentAnalysisReport);

// Password-protected PDF Generation & Dynamic Status QR Code
router.post('/:id/pdf', protect, generateProtectedPdf);

// Lock Extension Negotiation
router.post('/:id/request-extension', protect, requestLockExtension);
router.post('/:id/respond-extension', protect, respondLockExtension);

module.exports = router;

