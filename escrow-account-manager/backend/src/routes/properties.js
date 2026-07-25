const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');
const { createOffer, getOffersByProperty } = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes
router.post('/', protect, roleCheck('SELLER', 'ADMIN'), createProperty);
router.put('/:id', protect, roleCheck('SELLER', 'ADMIN'), updateProperty);
router.delete('/:id', protect, roleCheck('SELLER', 'ADMIN'), deleteProperty);

// Offers / Bids routes
router.post('/:id/offers', protect, roleCheck('BUYER'), createOffer);
router.get('/:id/offers', protect, getOffersByProperty);

module.exports = router;
