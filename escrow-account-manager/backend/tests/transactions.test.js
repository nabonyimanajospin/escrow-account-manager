/**
 * Transaction / Escrow state machine tests
 * Covers the full lifecycle: initiate → deposit → mutation → release/refund
 * plus all role guards and invalid-state rejections.
 */

const request = require('supertest');

jest.mock('../src/config/database', () => ({
  sequelize: {
    define: jest.fn(),
    authenticate: jest.fn(),
    sync: jest.fn(),
    transaction: jest.fn((cb) => cb('MOCK_TX')),
  },
  connectDB: jest.fn(),
}));

const { makeUser, makeProperty, makeEscrow, makeTransaction, tokenFor } = require('./helpers');

jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Property: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn() },
  Transaction: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  Escrow: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  AuditLog: {
    create: jest.fn(),
  },
}));

const { User, Property, Transaction, Escrow, AuditLog } = require('../src/models');
const app = require('../src/app');

// ─── Shared actors ────────────────────────────────────────────────────────────

const buyer  = makeUser({ id: 1, role: 'BUYER' });
const seller = makeUser({ id: 2, role: 'SELLER' });
const admin  = makeUser({ id: 99, role: 'ADMIN' });

beforeEach(() => {
  jest.clearAllMocks();
  // Mock AuditLog.create as resolved
  AuditLog.create.mockResolvedValue({});
  // Mock Transaction.count to resolve to 0 by default
  Transaction.count.mockResolvedValue(0);
});

// Helper: make findByPk return the right user for JWT middleware
const asUser = (u) => User.findByPk.mockResolvedValue(u);

// Helper: build a full transaction with its escrow included (as Sequelize would)
const fullTxn = (txnOverrides = {}, escrowOverrides = {}) => {
  const escrow = makeEscrow(escrowOverrides);
  const txn = makeTransaction({
    buyerAuthorized: true,
    sellerAuthorized: true,
    verificationCode: '1234',
    ...txnOverrides
  });
  txn.escrowAccount = escrow; // simulate include
  return { txn, escrow };
};

// ─── POST /api/escrow/initiate ─────────────────────────────────────────

describe('POST /api/escrow/initiate', () => {
  it('creates a transaction and escrow account for an AVAILABLE property', async () => {
    asUser(buyer);
    const prop = makeProperty({ id: 10, sellerId: 2, status: 'AVAILABLE', price: 100000 });
    Property.findByPk.mockResolvedValue(prop);

    const newTxn = makeTransaction({ id: 5, buyerId: 1, sellerId: 2, propertyId: 10 });
    Transaction.create.mockResolvedValue(newTxn);

    const newEscrow = makeEscrow({ id: 20, transactionId: 5, contractAddress: '0xabc123' });
    Escrow.create.mockResolvedValue(newEscrow);

    // findByPk called again to return full result with includes
    Transaction.findByPk.mockResolvedValue({ ...newTxn, escrowAccount: newEscrow, property: prop, buyer, seller });

    const res = await request(app)
      .post('/api/escrow/initiate')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ propertyId: 10 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prop.update).toHaveBeenCalledWith({ status: 'PENDING' }, expect.any(Object));
  });

  it('rejects if property is not AVAILABLE', async () => {
    asUser(buyer);
    Property.findByPk.mockResolvedValue(makeProperty({ status: 'PENDING' }));

    const res = await request(app)
      .post('/api/escrow/initiate')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ propertyId: 10 });

    expect(res.status).toBe(400);
  });

  it('rejects if buyer tries to buy their own property', async () => {
    asUser(buyer);
    Property.findByPk.mockResolvedValue(makeProperty({ sellerId: 1 })); // same as buyer id

    const res = await request(app)
      .post('/api/escrow/initiate')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ propertyId: 10 });

    expect(res.status).toBe(400);
  });

  it('blocks SELLER from initiating a transaction', async () => {
    asUser(seller);

    const res = await request(app)
      .post('/api/escrow/initiate')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send({ propertyId: 10 });

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/escrow/:id/deposit ──────────────────────────────────────

describe('POST /api/escrow/:id/deposit', () => {
  it('deposits the exact amount and moves status to FUNDED', async () => {
    asUser(buyer);
    const { txn, escrow } = fullTxn({ status: 'PENDING', buyerId: 1, amount: 100000 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)                                    // first call in controller
      .mockResolvedValueOnce({ ...txn, status: 'FUNDED' }); // final result fetch
    Escrow.findByPk.mockResolvedValue(escrow);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ amount: 100000 });

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'FUNDED' }), expect.any(Object));
    expect(escrow.update).toHaveBeenCalledWith(expect.objectContaining({ balance: 100000 }), expect.any(Object));
  });

  it('rejects wrong deposit amount', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'PENDING', buyerId: 1, amount: 100000 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ amount: 50000 }); // wrong amount

    expect(res.status).toBe(400);
  });

  it('rejects deposit when transaction is not PENDING', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'FUNDED', buyerId: 1, amount: 100000 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ amount: 100000 });

    expect(res.status).toBe(400);
  });

  it('blocks SELLER from depositing', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'PENDING', buyerId: 1, amount: 100000 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send({ amount: 100000 });

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/escrow/:id/initiate-mutation ────────────────────────────

describe('POST /api/escrow/:id/initiate-mutation', () => {
  it('moves status to MUTATION_STARTED when funds are deposited', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'FUNDED', sellerId: 2 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'MUTATION_STARTED' });

    const res = await request(app)
      .post('/api/escrow/5/initiate-mutation')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`);

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'MUTATION_STARTED' }), expect.any(Object));
  });

  it('rejects if status is not FUNDED', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'PENDING', sellerId: 2 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/initiate-mutation')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`);

    expect(res.status).toBe(400);
  });

  it('blocks BUYER from initiating mutation', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'FUNDED', sellerId: 2 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/initiate-mutation')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/escrow/:id/upload-document ──────────────────────────────

describe('POST /api/escrow/:id/upload-document', () => {
  it('uploads a document and keeps status at MUTATION_STARTED', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'MUTATION_STARTED', sellerId: 2 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn });

    const res = await request(app)
      .post('/api/escrow/5/upload-document')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`)
      .send({ documentUrl: 'https://example.com/doc.pdf', description: 'Land certificate' });

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({
      mutationDocuments: expect.arrayContaining([expect.objectContaining({ documentUrl: 'https://example.com/doc.pdf' })])
    }), expect.any(Object));
  });

  it('rejects upload without a documentUrl', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'MUTATION_STARTED', sellerId: 2 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/upload-document')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`)
      .send({ description: 'No URL provided' });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/escrow/:id/complete-mutation ────────────────────────────

describe('POST /api/escrow/:id/complete-mutation', () => {
  it('marks mutation complete/under_review when docs exist', async () => {
    asUser(seller);
    const { txn } = fullTxn({
      status: 'MUTATION_STARTED',
      sellerId: 2,
      mutationDocuments: [{ documentUrl: 'http://doc.pdf', description: 'proof' }]
    });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'UNDER_REVIEW' });

    const res = await request(app)
      .post('/api/escrow/5/complete-mutation')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`);

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'UNDER_REVIEW' }), expect.any(Object));
  });

  it('rejects complete-mutation if documents not yet uploaded', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'MUTATION_STARTED', sellerId: 2, mutationDocuments: [] });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/complete-mutation')
      .set('Authorization', `Bearer ${tokenFor.seller(2)}`);

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/admin/transactions/:id/release ──────────────────────────────────────

describe('POST /api/admin/transactions/:id/release', () => {
  it('releases funds to seller and marks property SOLD', async () => {
    asUser(admin);
    const escrow = makeEscrow({ balance: 100000 });
    const { txn } = fullTxn({ status: 'UNDER_REVIEW', propertyId: 10 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'COMPLETED' });
    Escrow.findByPk.mockResolvedValue(escrow);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }), expect.any(Object));
    expect(escrow.update).toHaveBeenCalledWith(expect.objectContaining({ balance: 0, status: 'RELEASED' }), expect.any(Object));
    expect(Property.update).toHaveBeenCalledWith({ status: 'SOLD' }, expect.any(Object));
  });

  it('rejects release if mutation is not completed/under_review yet', async () => {
    asUser(admin);
    const { txn } = fullTxn({ status: 'MUTATION_STARTED' });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(400);
  });

  it('blocks SELLER from releasing funds', async () => {
    asUser(seller);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.seller()}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/admin/transactions/:id/refund ───────────────────────────────────────

describe('POST /api/admin/transactions/:id/refund', () => {
  it('refunds buyer and marks property AVAILABLE', async () => {
    asUser(admin);
    const escrow = makeEscrow({ balance: 100000 });
    const { txn } = fullTxn({ status: 'UNDER_REVIEW', propertyId: 10 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'REFUNDED' });
    Escrow.findByPk.mockResolvedValue(escrow);

    const res = await request(app)
      .post('/api/admin/transactions/5/refund')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'REFUNDED' }), expect.any(Object));
    expect(escrow.update).toHaveBeenCalledWith(expect.objectContaining({ balance: 0, status: 'REFUNDED' }), expect.any(Object));
    expect(Property.update).toHaveBeenCalledWith({ status: 'AVAILABLE' }, expect.any(Object));
  });

  it('rejects refund at PENDING state (no funds to refund)', async () => {
    asUser(admin);
    const { txn } = fullTxn({ status: 'PENDING' });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/admin/transactions/5/refund')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(400);
  });

  it('blocks BUYER from triggering a refund', async () => {
    asUser(buyer);

    const res = await request(app)
      .post('/api/admin/transactions/5/refund')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/escrow/:id/cancel ───────────────────────────────────────

describe('POST /api/escrow/:id/cancel', () => {
  it('allows buyer to cancel a PENDING transaction (no funds deposited)', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'PENDING', buyerId: 1, propertyId: 10 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'REFUNDED' });

    const res = await request(app)
      .post('/api/escrow/5/cancel')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(200);
    expect(Property.update).toHaveBeenCalledWith({ status: 'AVAILABLE' }, expect.any(Object));
  });

  it('blocks cancel after mutation has started', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'UNDER_REVIEW', buyerId: 1 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/cancel')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`);

    expect(res.status).toBe(400);
  });

  it('blocks SELLER from cancelling a transaction', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'PENDING', buyerId: 1 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/cancel')
      .set('Authorization', `Bearer ${tokenFor.seller()}`);

    // seller is not the buyer — controller returns 403
    expect(res.status).toBe(403);
  });
});
