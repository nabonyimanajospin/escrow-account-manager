const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes
router.post('/', protect, roleCheck('SELLER', 'ADMIN'), createProperty);
router.put('/:id', protect, roleCheck('SELLER', 'ADMIN'), updateProperty);
router.delete('/:id', protect, roleCheck('SELLER', 'ADMIN'), deleteProperty);

module.exports = router;
