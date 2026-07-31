/**
 * Property API tests
 * Covers: list, create (SELLER only), update ownership, delete guards
 */

const request = require('supertest');

jest.mock('../src/config/database', () => ({
  sequelize: { define: jest.fn(), authenticate: jest.fn(), sync: jest.fn() },
  connectDB: jest.fn(),
}));

const { makeUser, makeProperty, tokenFor } = require('./helpers');

jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Property: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Transaction: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Escrow: { findByPk: jest.fn(), create: jest.fn(), destroy: jest.fn() },
}));

const { User, Property } = require('../src/models');
const app = require('../src/app');

const seller = makeUser({ id: 2, role: 'SELLER' });
const buyer  = makeUser({ id: 1, role: 'BUYER' });
const admin  = makeUser({ id: 99, role: 'ADMIN' });

// Resolve the JWT user for every protected request
const resolveUser = (user) => User.findByPk.mockResolvedValue(user);

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/properties ──────────────────────────────────────────────────────

describe('GET /api/properties', () => {
  it('returns all properties for authenticated user', async () => {
    resolveUser(buyer);
    Property.findAndCountAll = jest.fn().mockResolvedValue({ count: 2, rows: [makeProperty(), makeProperty({ id: 11, title: 'Villa' })] });

    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 200 without token (public route — anyone can browse)', async () => {
    Property.findAndCountAll = jest.fn().mockResolvedValue({ count: 1, rows: [makeProperty()] });
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/properties ─────────────────────────────────────────────────────

describe('POST /api/properties', () => {
  const validPayload = {
    title: 'My House',
    description: 'A great house',
    price: 50000,
    location: 'Kigali',
    bedrooms: 3,
    bathrooms: 2,
    area: 100,
    propertyType: 'HOUSE',
    upiCode: '1/03/01/04/1000',
  };

  it('allows SELLER to create a listing', async () => {
    resolveUser(seller);
    Property.create.mockResolvedValue(makeProperty({ sellerId: 2, ...validPayload }));

    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('blocks BUYER from creating a listing with 403', async () => {
    resolveUser(buyer);

    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  it('allows ADMIN to create a listing (SELLER + ADMIN both permitted)', async () => {
    resolveUser(admin);
    Property.create.mockResolvedValue(makeProperty({ sellerId: 99, ...validPayload }));

    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
  });
});

// ─── PUT /api/properties/:id ──────────────────────────────────────────────────

describe('PUT /api/properties/:id', () => {
  it('allows the owning SELLER to update their listing', async () => {
    resolveUser(seller);
    const prop = makeProperty({ sellerId: 2, status: 'AVAILABLE' });
    Property.findByPk.mockResolvedValue(prop);

    const res = await request(app)
      .put('/api/properties/10')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
  });

  it('blocks a different SELLER from updating another seller\'s listing', async () => {
    resolveUser(makeUser({ id: 3, role: 'SELLER' }));
    Property.findByPk.mockResolvedValue(makeProperty({ sellerId: 2 })); // owned by seller 2

    const res = await request(app)
      .put('/api/properties/10')
      .set('Authorization', `Bearer ${tokenFor.seller(3)}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/properties/:id ───────────────────────────────────────────────

describe('DELETE /api/properties/:id', () => {
  it('blocks deletion of a PENDING property (active deal)', async () => {
    resolveUser(admin);
    Property.findByPk.mockResolvedValue(makeProperty({ status: 'PENDING' }));

    const res = await request(app)
      .delete('/api/properties/10')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(400);
  });

  it('allows ADMIN to delete an AVAILABLE property', async () => {
    resolveUser(admin);
    const prop = makeProperty({ status: 'AVAILABLE' });
    prop.destroy = jest.fn().mockResolvedValue();
    Property.findByPk.mockResolvedValue(prop);

    const res = await request(app)
      .delete('/api/properties/10')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(200);
  });

  it('blocks BUYER from deleting any property', async () => {
    resolveUser(buyer);
    Property.findByPk.mockResolvedValue(makeProperty({ status: 'AVAILABLE' }));

    const res = await request(app)
      .delete('/api/properties/10')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(403);
  });
});
