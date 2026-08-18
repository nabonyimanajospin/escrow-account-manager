const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  bio: user.bio,
  walletBalance: user.walletBalance,
  isKycVerified: user.isKycVerified,
  kycVerifiedAt: user.kycVerifiedAt,
  kycDocumentUrl: user.kycDocumentUrl,
  nationalIdNumber: user.nationalIdNumber,
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password and role',
      });
    }

    if (role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Registration as an Admin is not permitted',
      });
    }

    if (!['BUYER', 'SELLER'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either BUYER or SELLER',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      role,
      phone,
      address,
      isKycVerified: false,
    });
    const token = generateToken(user.id);
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
    res.cookie('escrowtrust_token', token, cookieOptions);

    res.status(201).json({
      success: true,
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user.id);
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
    res.cookie('escrowtrust_token', token, cookieOptions);

    res.status(200).json({
      success: true,
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('escrowtrust_token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile (name, phone, address, bio, password)
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const { name, phone, address, bio, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name)    user.name    = name;
    if (phone !== undefined)   user.phone   = phone;
    if (address !== undefined) user.address = address;
    if (bio !== undefined)     user.bio     = bio;

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      }
      user.password = newPassword; // beforeUpdate hook will hash it
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private (ADMIN)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

const notificationService = require('../services/notificationService');
const resetOtpStore = new Map();

// @desc    Forgot Password - Request 6-digit OTP code via email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user account registered with this email address' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    resetOtpStore.set(cleanEmail, { otp, expiresAt });

    await notificationService.sendOtpEmail(user.email, user.name, otp, 'PASSWORD-RESET', {
      phone: user.phone,
      userId: user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email, phone (if registered), and in-app notifications.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with 6-digit OTP verification code
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP verification code, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const storedRecord = resetOtpStore.get(cleanEmail);

    if (!storedRecord || storedRecord.otp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code' });
    }

    if (Date.now() > storedRecord.expiresAt) {
      resetOtpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP verification code has expired. Please request a new code.' });
    }

    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();
    resetOtpStore.delete(cleanEmail);

    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You may now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
