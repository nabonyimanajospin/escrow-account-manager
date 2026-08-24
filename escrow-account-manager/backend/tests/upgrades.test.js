const request = require('supertest');

jest.mock('../src/config/database', () => ({
  sequelize: {
    define: jest.fn(),
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    transaction: jest.fn(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } })),
  },
  connectDB: jest.fn(),
}));

const { makeUser, makeProperty, makeTransaction, makeEscrow, tokenFor } = require('./helpers');

jest.mock('../src/models', () => {
  const createMockModel = () => ({
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
    scope: jest.fn(),
  });
  return {
    User: createMockModel(),
    Property: createMockModel(),
    Transaction: createMockModel(),
    Escrow: createMockModel(),
    AuditLog: { create: jest.fn().mockResolvedValue({}) },
    Dispute: createMockModel(),
    DisputeEvidence: createMockModel(),
    Notification: createMockModel(),
    LedgerEntry: createMockModel(),
    WalletTransaction: { create: jest.fn().mockResolvedValue({}) },
  };
});

jest.mock('../src/services/notificationService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendConsensusCode: jest.fn().mockResolvedValue(undefined),
  notifyUserTriChannel: jest.fn().mockResolvedValue(undefined),
  sendTransactionStatusEmail: jest.fn().mockResolvedValue(undefined),
  sendDisputeNotificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWalletCreditEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  createInAppNotification: jest.fn().mockResolvedValue(undefined),
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
}));


jest.mock('../src/services/contractService', () => ({
  generateEscrowContract: jest.fn().mockResolvedValue('/uploads/contracts/test.pdf'),
}));

// Mock ledger entries service
jest.mock('../src/services/ledgerService', () => ({
  recordEntry: jest.fn().mockResolvedValue(),
}));

const { User, Property, Transaction, Escrow, Dispute, DisputeEvidence, Notification } = require('../src/models');
const app = require('../src/app');

const seller = makeUser({ id: 2, role: 'SELLER', name: 'Alice Ishimwe' });
const buyer  = makeUser({ id: 1, role: 'BUYER', name: 'Jospin Nabonyimana' });
const admin  = makeUser({ id: 99, role: 'ADMIN', name: 'Admin Arbitrator' });

const resolveUser = (user) => User.findByPk.mockResolvedValue(user);

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure scopes mapping chain works
  Transaction.scope.mockReturnValue(Transaction);
});

describe('Sprint 2 Hardening - Real-Estate Escrow Upgrades', () => {
  // Test 1: Property creation with listingType, biddingDeadline, upiCode
  it('saves listingType, biddingDeadline, and upiCode when creating property', async () => {
    resolveUser(seller);
    Property.create.mockImplementation((data) => Promise.resolve({ id: 10, ...data }));
    
    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${tokenFor.seller()}`)
      .send({
        title: 'Kiyovu Luxury Villa',
        description: 'Exclusive 5-bedroom luxury estate featuring modern amenities',
        price: 450000.00,
        location: 'Kiyovu, Kigali',
        bedrooms: 5,
        bathrooms: 4,
        area: 520.00,
        propertyType: 'VILLA',
        listingType: 'AUCTION',
        biddingDeadline: new Date(Date.now() + 1000000),
        upiCode: '1/03/01/04/1000',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.listingType).toBe('AUCTION');
    expect(res.body.data.upiCode).toBe('1/03/01/04/1000');
    expect(Property.create).toHaveBeenCalled();
  });

  // Test 2: Admin release only requires audit notes (demo — registry/receipt checks skipped)
  it('allows admin release with audit notes only', async () => {
    resolveUser(admin);
    const escrow = makeEscrow({ balance: 100000, releaseHistory: [], update: jest.fn().mockResolvedValue(true) });
    const mockTx = makeTransaction({
      status: 'UNDER_REVIEW',
      registryValidationReport: null,
      buyerConfirmedPropertyReceivedAt: null,
      escrowAccountId: 1,
      amount: 100000,
      sellerFee: 1500,
      buyerFee: 1000,
      update: jest.fn().mockResolvedValue(true),
    });
    Transaction.findByPk.mockReset();
    Transaction.findByPk
      .mockResolvedValueOnce(mockTx)
      .mockResolvedValueOnce({ ...mockTx, status: 'AWAITING_RECEIPT' });
    Escrow.findByPk.mockResolvedValue(escrow);
    User.findByPk
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce({ ...seller, walletBalance: 0, update: jest.fn().mockResolvedValue(true) });

    const res = await request(app)
      .post(`/api/admin/transactions/${mockTx.id}/release`)
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send({ adminNotes: 'Demo presentation release' });

    expect(res.status).toBe(200);
    expect(mockTx.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'AWAITING_RECEIPT' }), expect.any(Object));
  });

  it('prevents release if adminNotes are not provided', async () => {
    resolveUser(admin);
    const mockTx = makeTransaction({
      status: 'UNDER_REVIEW',
      registryValidationReport: { registryRecordFound: 'VERIFIED', upiFormatMatch: 'VERIFIED' },
      buyerConfirmedPropertyReceivedAt: new Date(),
    });
    Transaction.findByPk.mockReset();
    Transaction.findByPk.mockResolvedValue(mockTx);

    const res = await request(app)
      .post(`/api/admin/transactions/${mockTx.id}/release`)
      .set('Authorization', `Bearer ${tokenFor.admin()}`)
      .send({}); // no notes

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Please enter the admin review audit notes');
  });

  // Test 3: Dispute raise and resolution flow
  it('raises an active dispute and locks escrow funds', async () => {
    resolveUser(buyer);
    const mockTx = makeTransaction({ id: 5, status: 'FUNDED', buyerId: buyer.id });
    Transaction.findByPk.mockResolvedValue(mockTx);
    Dispute.findOne.mockResolvedValue(null); // No active dispute
    Dispute.create.mockResolvedValue({ id: 1, transactionId: 5, initiatorId: buyer.id, status: 'OPEN' });

    const res = await request(app)
      .post(`/api/escrow/${mockTx.id}/dispute`)
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ reason: 'Seller has not responded for 3 days' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Dispute successfully filed');
    expect(mockTx.update).toHaveBeenCalledWith({ status: 'DISPUTED' }, expect.any(Object));
  });

  it('uploads evidence for an active open dispute case', async () => {
    resolveUser(buyer);
    const mockTx = makeTransaction({ id: 5, status: 'DISPUTED', buyerId: buyer.id });
    Transaction.findByPk.mockResolvedValue(mockTx);
    Dispute.findOne.mockResolvedValue({
      id: 1,
      transactionId: 5,
      status: 'OPEN',
      update: jest.fn().mockResolvedValue(true)
    });
    DisputeEvidence.create.mockResolvedValue({ id: 9, disputeId: 1, uploaderId: buyer.id });

    const res = await request(app)
      .post(`/api/escrow/${mockTx.id}/dispute/evidence`)
      .set('Authorization', `Bearer ${tokenFor.buyer()}`)
      .send({ fileUrl: '/uploads/evidence/deed-proof.txt', description: 'Deed signature analysis report' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Evidence successfully uploaded');
  });

  it('allows Admin to initiate active mediation on a dispute case', async () => {
    resolveUser(admin);
    const mockTx = makeTransaction({ id: 5, status: 'DISPUTED' });
    Transaction.findByPk.mockResolvedValue(mockTx);
    Dispute.findOne.mockResolvedValue({
      id: 1,
      transactionId: 5,
      status: 'OPEN',
      update: jest.fn().mockResolvedValue(true)
    });

    const res = await request(app)
      .post(`/api/escrow/${mockTx.id}/dispute/mediate`)
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Dispute status updated to active mediation');
  });

  it('verifies ledger integrity verification check endpoint', async () => {
    resolveUser(admin);
    const mockAuditLogModel = require('../src/models').AuditLog;
    mockAuditLogModel.verifyChain = jest.fn().mockResolvedValue({ valid: true, checked: 5 });

    const res = await request(app)
      .get('/api/admin/audit-logs/verify')
      .set('Authorization', `Bearer ${tokenFor.admin()}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.checked).toBe(5);
  });
});
