/**
 * Shared mock factories used across all test files.
 * All Sequelize model calls are replaced with jest.fn() so no real
 * database connection is needed to run the tests.
 */

const jwt = require('jsonwebtoken');

// ─── Token helpers ────────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET || 'test_secret';

const makeToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1h' });

const tokenFor = {
  buyer:  (id = 1)  => makeToken({ id, role: 'BUYER' }),
  seller: (id = 2)  => makeToken({ id, role: 'SELLER' }),
  admin:  (id = 99) => makeToken({ id, role: 'ADMIN' }),
};

// ─── Model mock builders ──────────────────────────────────────────────────────

/** Returns a plain object that looks like a Sequelize User instance */
const makeUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: '$2a$10$hashedpassword',
  role: 'BUYER',
  phone: null,
  address: null,
  matchPassword: jest.fn().mockResolvedValue(true),
  update: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  ...overrides,
});

const makeProperty = (overrides = {}) => ({
  id: 10,
  sellerId: 2,
  title: 'Test House',
  description: 'A nice house',
  price: 100000,
  location: 'Kigali',
  bedrooms: 3,
  bathrooms: 2,
  area: 120,
  propertyType: 'HOUSE',
  images: [],
  status: 'AVAILABLE',
  upiCode: '1/03/01/04/3000',
  update: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  ...overrides,
});

const makeEscrow = (overrides = {}) => ({
  id: 20,
  transactionId: 5,
  accountNumber: 'ESC-TEST-001',
  balance: 0,
  currency: 'USD',
  status: 'ACTIVE',
  depositHistory: [],
  releaseHistory: [],
  update: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  ...overrides,
});

const makeTransaction = (overrides = {}) => ({
  id: 5,
  transactionId: 'TXN-TEST-001',
  propertyId: 10,
  buyerId: 1,
  sellerId: 2,
  amount: 100000,
  escrowAccountId: 20,
  status: 'PENDING',
  mutationDocuments: [],
  update: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  ...overrides,
});

module.exports = { tokenFor, makeUser, makeProperty, makeEscrow, makeTransaction };
