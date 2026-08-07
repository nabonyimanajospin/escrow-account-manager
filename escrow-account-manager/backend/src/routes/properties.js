const express = require('express');
const router = express.Router();
const {
  getProperties,
  getMyProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  generateDescription,
} = require('../controllers/propertyController');
const { createOffer, getOffersByProperty } = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const requireKyc = require('../middleware/kycRequired');
const { uploadPropertyImage } = require('../middleware/upload');

// Public routes
router.post('/ai-description', protect, roleCheck('SELLER'), requireKyc, generateDescription);
router.get('/mine', protect, roleCheck('SELLER', 'ADMIN'), getMyProperties);
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes (with optional image upload)
router.post('/', protect, roleCheck('SELLER', 'ADMIN'), requireKyc, uploadPropertyImage, createProperty);
router.put('/:id', protect, roleCheck('SELLER', 'ADMIN'), requireKyc, uploadPropertyImage, updateProperty);
router.delete('/:id', protect, roleCheck('SELLER', 'ADMIN'), deleteProperty);

// Offers / Bids routes
router.post('/:id/offers', protect, roleCheck('BUYER'), requireKyc, createOffer);
router.get('/:id/offers', protect, getOffersByProperty);

module.exports = router;
