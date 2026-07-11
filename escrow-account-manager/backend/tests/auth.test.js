/**
 * Auth API tests
 * Covers: register, login, /me — with mocked DB
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// ─── Mock dependencies before importing app ───────────────────────────────────

jest.mock('../src/config/database', () => ({
  sequelize: {
    define: jest.fn(),
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
  },
  connectDB: jest.fn(),
}));

const { makeUser, tokenFor } = require('./helpers');

// Mock the User model
const mockUser = makeUser();
jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Property: { findAll: jest.fn(), findByPk: jest.fn() },
  Transaction: { findAll: jest.fn(), findByPk: jest.fn() },
  EscrowAccount: { findByPk: jest.fn() },
}));

const { User } = require('../src/models');
const app = require('../src/app');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a new user and returns a token', async () => {
    User.findOne.mockResolvedValue(null); // no duplicate
    User.create.mockResolvedValue(makeUser({ id: 1, name: 'Alice', email: 'alice@test.com', role: 'BUYER' }));

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      role: 'BUYER',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rejects duplicate email with 400', async () => {
    User.findOne.mockResolvedValue(makeUser({ email: 'alice@test.com' }));

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      role: 'BUYER',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns token on valid credentials', async () => {
    const user = makeUser({ email: 'alice@test.com' });
    user.matchPassword = jest.fn().mockResolvedValue(true);
    User.findOne.mockResolvedValue(user);

    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password with 401', async () => {
    const user = makeUser();
    user.matchPassword = jest.fn().mockResolvedValue(false);
    User.findOne.mockResolvedValue(user);

    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns current user when authenticated', async () => {
    const user = makeUser({ id: 1, role: 'BUYER' });
    User.findByPk.mockResolvedValue(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenFor.buyer(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
