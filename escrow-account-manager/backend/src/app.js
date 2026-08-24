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
const isProduction = process.env.NODE_ENV === 'production';

// General API rate limit (relaxed in dev/demo so buyer/admin flows are not blocked)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a few minutes.', error: 'Too many requests. Please try again in a few minutes.' },
});

// Strict limiter for sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait a few minutes.', error: 'Too many login attempts. Please wait a few minutes.' },
});

// OTP verification limiter
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP attempts. Please wait a few minutes.', error: 'Too many OTP attempts. Please wait a few minutes.' },
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

// Public property images only (sensitive docs require authenticated /api/files routes)
app.use('/uploads/properties', express.static(path.join(__dirname, '..', 'uploads', 'properties')));

// Contract download fallback route for generated PDF certificates
app.get('/uploads/contracts/:filename', protect, async (req, res) => {
  const contractsDir = path.join(__dirname, '..', 'uploads', 'contracts');
  const fs = require('fs');
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  const requestedFile = path.join(contractsDir, req.params.filename);
  try {
    const { Transaction } = require('./models');
    const { generateEscrowContract } = require('./services/contractService');
    const { transactionIncludes } = require('./utils/transactionHelpers');

    const txIdMatch = req.params.filename.match(/(TXN-[A-Z0-9-]+)/i);
    let tx = null;
    if (txIdMatch) {
      tx = await Transaction.findOne({
        where: { transactionId: txIdMatch[1].toUpperCase() },
        include: transactionIncludes,
      });
    }
    if (!tx) {
      tx = await Transaction.findOne({
        where: { contractDocumentUrl: `/uploads/contracts/${req.params.filename}` },
        include: transactionIncludes,
      });
    }
    if (tx) {
      // Always regenerate so downloads use the latest Articles template (not a stale PDF on disk).
      await generateEscrowContract(tx, req.params.filename);
    }
  } catch (err) {
    logger.error('[Contract On-the-Fly] Error:', err.message);
  }
  if (fs.existsSync(requestedFile)) {
    return res.sendFile(requestedFile);
  }
  res.status(404).send('Contract document unavailable.');
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/files',     require('./routes/files'));
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/escrow',     require('./routes/escrow'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/currency',   require('./routes/currency'));
app.use('/api/wallet',     require('./routes/wallet'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/kyc',        require('./routes/kyc'));
app.use('/api/integrations', require('./routes/integrations'));

app.get('/health', (req, res) => res.json({ status: 'OK', version: '2.0.0' }));

app.use(errorHandler);

module.exports = app;
