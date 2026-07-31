const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateMe, getUsers } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/users', protect, roleCheck('ADMIN'), getUsers);

module.exports = router;
