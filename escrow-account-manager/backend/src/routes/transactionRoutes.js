const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransaction,
  initiateTransaction,
  depositFunds,
  initiateMutation,
  uploadMutationDocument,
  completeMutation,
  releaseFunds,
  refundBuyer
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');

// All routes require protection
router.use(protect);

router.route('/')
  .get(getTransactions);

router.route('/initiate')
  .post(authorize('BUYER'), initiateTransaction);

router.route('/:id')
  .get(getTransaction);

router.route('/:id/deposit')
  .post(authorize('BUYER'), depositFunds);

router.route('/:id/initiate-mutation')
  .post(authorize('SELLER'), initiateMutation);

router.route('/:id/upload-document')
  .post(authorize('SELLER'), uploadMutationDocument);

router.route('/:id/complete-mutation')
  .post(authorize('SELLER', 'ADMIN'), completeMutation);

router.route('/:id/release')
  .post(authorize('ADMIN'), releaseFunds);

router.route('/:id/refund')
  .post(authorize('ADMIN'), refundBuyer);

module.exports = router;
