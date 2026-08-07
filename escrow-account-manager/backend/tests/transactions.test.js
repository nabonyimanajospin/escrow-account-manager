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
    transaction: jest.fn((cb) => cb({ LOCK: { UPDATE: 'UPDATE' } })),
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
  LedgerEntry: {
    create: jest.fn(),
  },
  Offer: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  Dispute: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  DisputeEvidence: { create: jest.fn() },
  WalletTransaction: { create: jest.fn() },
}));

// Mock notification service to avoid real email calls in tests
jest.mock('../src/services/notificationService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendConsensusCode: jest.fn().mockResolvedValue(undefined),
  sendTransactionStatusEmail: jest.fn().mockResolvedValue(undefined),
  sendDisputeNotificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWalletCreditEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
}));

const { User, Property, Transaction, Escrow, AuditLog, LedgerEntry, Offer, WalletTransaction } = require('../src/models');

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

const fullTxn = (txnOverrides = {}, escrowOverrides = {}) => {
  const escrow = makeEscrow(escrowOverrides);
  const prop = makeProperty();
  const txn = makeTransaction({
    buyerAuthorized: true,
    sellerAuthorized: true,
    verificationCode: '1234',
    registryValidationReport: { registryRecordFound: 'VERIFIED', upiFormatMatch: 'VERIFIED' },
    buyerConfirmedPropertyReceivedAt: new Date(),
    ...txnOverrides
  });
  txn.escrowAccount = escrow; // simulate include
  txn.seller = seller;
  txn.buyer = buyer;
  txn.property = prop;
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

  it('blocks unverified BUYER from initiating a transaction', async () => {
    asUser(makeUser({ id: 1, role: 'BUYER', isKycVerified: false }));

    const res = await request(app)
      .post('/api/escrow/initiate')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ propertyId: 10 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/KYC verification is required/);
  });
});

// ─── POST /api/escrow/:id/deposit ──────────────────────────────────────

describe('POST /api/escrow/:id/deposit', () => {
  it('deposits the exact amount and moves status to FUNDED', async () => {
    asUser({ ...buyer, walletBalance: 500000, update: jest.fn().mockResolvedValue(true) });
    const { txn, escrow } = fullTxn({ status: 'PENDING', buyerId: 1, amount: 100000, buyerFee: 0, sellerFee: 0 });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)                                    // first call in controller
      .mockResolvedValueOnce({ ...txn, status: 'FUNDED' }); // final result fetch
    Escrow.findByPk.mockResolvedValue(escrow);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ amount: 100000, reference: 'DEP-12345' });

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
      .send({ amount: 50000, reference: 'DEP-54321' }); // wrong amount

    expect(res.status).toBe(400);
  });

  it('rejects deposit when transaction is not PENDING', async () => {
    asUser(buyer);
    const { txn } = fullTxn({ status: 'FUNDED', buyerId: 1, amount: 100000 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ amount: 100000, reference: 'DEP-12345' });

    expect(res.status).toBe(400);
  });

  it('blocks SELLER from depositing', async () => {
    asUser(seller);
    const { txn } = fullTxn({ status: 'PENDING', buyerId: 1, amount: 100000 });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/deposit')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send({ amount: 100000, reference: 'DEP-12345' });

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
      .send({ documentUrl: '/uploads/mutations/doc.pdf', description: 'Land certificate' });

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({
      mutationDocuments: expect.arrayContaining([expect.objectContaining({ documentUrl: '/uploads/mutations/doc.pdf' })])
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
      sellerAuthorized: true,
      mutationDocuments: [{ documentUrl: '/uploads/mutations/doc.pdf', description: 'proof' }]
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
  it('releases funds to seller changing status to AWAITING_RECEIPT', async () => {
    asUser(admin);
    const escrow = makeEscrow({ balance: 100000 });
    const { txn } = fullTxn({
      status: 'UNDER_REVIEW',
      propertyId: 10,
      sellerId: 2,
      buyerFee: 1000,
      sellerFee: 1500,
      registryValidationReport: { registryRecordFound: 'VERIFIED', upiFormatMatch: 'VERIFIED' },
      buyerConfirmedPropertyReceivedAt: new Date(),
    });
    Transaction.findByPk
      .mockResolvedValueOnce(txn)
      .mockResolvedValueOnce({ ...txn, status: 'AWAITING_RECEIPT' });
    Escrow.findByPk.mockResolvedValue(escrow);

    // First call is auth middleware (admin), second call is wallet credit (seller)
    User.findByPk
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce({ ...seller, walletBalance: 0, update: jest.fn().mockResolvedValue(true) });

    WalletTransaction.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send({ adminNotes: 'Audit checks complete' });

    expect(res.status).toBe(200);
    expect(txn.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'AWAITING_RECEIPT' }), expect.any(Object));
    expect(escrow.update).toHaveBeenCalledWith(expect.objectContaining({ balance: 0, status: 'RELEASED' }), expect.any(Object));
  });

  it('rejects release if mutation is not completed/under_review yet', async () => {
    asUser(admin);
    const { txn } = fullTxn({ status: 'MUTATION_STARTED' });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send({ adminNotes: 'Audit checks complete' });

    expect(res.status).toBe(400);
  });

  it('blocks direct admin release of DISPUTED transactions', async () => {
    asUser(admin);
    const { txn } = fullTxn({ status: 'DISPUTED' });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send({ adminNotes: 'Audit checks complete' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/dispute resolution workflow/i);
  });

  it('blocks SELLER from releasing funds', async () => {
    asUser(seller);

    const res = await request(app)
      .post('/api/admin/transactions/5/release')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send({ adminNotes: 'Audit checks complete' });

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
      .send({ adminNotes: 'Refund testing' })
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    if (res.status !== 200) console.log('Refund Test Error:', res.body);
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

    if (res.status !== 200) console.log('Cancel Test Error:', res.body);
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

// ─── POST /api/escrow/:id/verify-registry ──────────────────────────────

describe('POST /api/escrow/:id/verify-registry', () => {
  it('fails verification if uploaded deed has invalid text structure', async () => {
    asUser(seller);
    const { txn } = fullTxn({
      status: 'MUTATION_STARTED',
      mutationDocuments: [{
        documentUrl: '/uploads/invalid.pdf',
        description: 'Invalid Document'
      }]
    });
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/verify-registry')
      .set('Authorization', `Bearer ${tokenFor.seller()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Registry verification failed/);
  });

  it('succeeds verification if deed matches buyer, seller, property, and UPI syntax', async () => {
    asUser(seller);
    const { txn } = fullTxn({
      status: 'MUTATION_STARTED',
      propertyId: 10,
    });
    
    // Configure mock to match Land Registry database lookup coordinates
    txn.seller.name = 'Alice Ishimwe';
    txn.property.title = 'Kimihurura Heights Apartment';
    txn.property.upiCode = '1/03/01/04/1000';
    
    const deedText = `DEED OF MUTATION TRANSFER
PROPERTY ID: ${txn.propertyId}
PROPERTY TITLE: ${txn.property.title.toUpperCase()}
SELLER: ${txn.seller.name.toUpperCase()}
BUYER: ${txn.buyer.name.toUpperCase()}
UNIQUE PARCEL IDENTIFIER: 1/03/01/04/1000`;
    
    txn.mutationDocuments = [{
      documentUrl: '/uploads/valid-deed.pdf',
      description: deedText
    }];
    
    Transaction.findByPk.mockResolvedValue(txn);

    const res = await request(app)
      .post('/api/escrow/5/verify-registry')
      .set('Authorization', `Bearer ${tokenFor.seller()}`);

    if (res.status !== 200) console.log('Verify-Registry Test Error:', res.body);
    expect(res.status).toBe(200);
    expect(res.body.report.upiFormatMatch).toBe('VERIFIED');
    expect(res.body.report.registryRecordFound).toBe('VERIFIED');
  });
});
