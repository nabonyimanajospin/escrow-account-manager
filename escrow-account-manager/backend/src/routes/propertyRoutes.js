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

router.get('/', protect, getProperties);
router.post('/', protect, authorize('SELLER', 'ADMIN'), createProperty);
router.get('/:id', protect, getProperty);
router.put('/:id', protect, authorize('SELLER', 'ADMIN'), updateProperty);
router.delete('/:id', protect, authorize('SELLER', 'ADMIN'), deleteProperty);

module.exports = router;
