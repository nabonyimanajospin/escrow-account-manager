const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { serveFile, servePropertyImage } = require('../controllers/fileController');

// Public property listing images
router.get('/properties/:filename', servePropertyImage);

// Protected sensitive documents
router.get('/:category/:filename', protect, serveFile);

module.exports = router;
