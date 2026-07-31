const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
require('dotenv').config();

// ─── Startup Environment Validation ──────────────────────────────────────────
const REQUIRED_ENV = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  logger.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  logger.error('[FATAL] Server cannot start. Please check your .env file.');
  process.exit(1);
}

require('./models');

const app = express();

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving /uploads images
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
});

// Strict limiter for sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
});

// OTP verification limiter
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP attempts. Please wait 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/escrow/verify-otp', otpLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// ─── Input Sanitization (HPP + Helmet CSP) ────────────────────────────────────────
app.use(hpp());

// ─── Static File Serving (uploaded files) ────────────────────────────────────
const { protect } = require('./middleware/auth');

// Publicly accessible property images (for marketplace)
app.use('/uploads/properties', express.static(path.join(__dirname, '..', 'uploads', 'properties')));

// Protected sensitive documents (KYC, mutation deeds, evidence)
app.use('/uploads', protect, express.static(path.join(__dirname, '..', 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/escrow',     require('./routes/escrow'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/currency',   require('./routes/currency'));
app.use('/api/wallet',     require('./routes/wallet'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/kyc',        require('./routes/kyc'));

app.get('/health', (req, res) => res.json({ status: 'OK', version: '2.0.0' }));

app.use(errorHandler);

module.exports = app;
