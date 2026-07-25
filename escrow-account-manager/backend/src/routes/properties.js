const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  generateDescription,
} = require('../controllers/propertyController');
const { createOffer, getOffersByProperty } = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { uploadPropertyImage } = require('../middleware/upload');

// Public routes
router.post('/ai-description', protect, roleCheck('SELLER'), generateDescription);
router.get('/', protect, getProperties);
router.get('/:id', protect, getProperty);

// Protected routes (with optional image upload)
router.post('/', protect, roleCheck('SELLER', 'ADMIN'), uploadPropertyImage, createProperty);
router.put('/:id', protect, roleCheck('SELLER', 'ADMIN'), uploadPropertyImage, updateProperty);
router.delete('/:id', protect, roleCheck('SELLER', 'ADMIN'), deleteProperty);

// Offers / Bids routes
router.post('/:id/offers', protect, roleCheck('BUYER'), createOffer);
router.get('/:id/offers', protect, getOffersByProperty);

module.exports = router;
