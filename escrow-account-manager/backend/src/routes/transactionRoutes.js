const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getMyTransactions,
  getTransaction,
  initiateTransaction,
  depositFunds,
  initiateMutation,
  uploadMutationDocument,
  completeMutation,
  releaseFunds,
  refundBuyer,
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('ADMIN'), getTransactions);
router.get('/my', protect, authorize('BUYER', 'SELLER'), getMyTransactions);
router.get('/:id', protect, getTransaction);
router.post('/initiate', protect, authorize('BUYER'), initiateTransaction);
router.post('/:id/deposit', protect, authorize('BUYER'), depositFunds);
router.post('/:id/initiate-mutation', protect, authorize('SELLER'), initiateMutation);
router.post('/:id/upload-document', protect, authorize('SELLER'), uploadMutationDocument);
router.post('/:id/complete-mutation', protect, authorize('SELLER', 'ADMIN'), completeMutation);
router.post('/:id/release', protect, authorize('ADMIN'), releaseFunds);
router.post('/:id/refund', protect, authorize('ADMIN'), refundBuyer);

module.exports = router;
