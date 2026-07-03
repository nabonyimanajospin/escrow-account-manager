const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');

// Public routes — anyone can browse properties (including non-logged-in visitors)
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes — only SELLER and ADMIN can create, update, or delete
router.post('/', protect, authorize('SELLER', 'ADMIN'), createProperty);
router.put('/:id', protect, authorize('SELLER', 'ADMIN'), updateProperty);
router.delete('/:id', protect, authorize('SELLER', 'ADMIN'), deleteProperty);

module.exports = router;
