/**
 * seed.js — Database Seed Script
 * Resets and populates the Escrow Account Manager database with mock data.
 *
 * Usage:  node seed.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User, Property, Transaction, Escrow, AuditLog } = require('./src/models');

const ADMIN_DATA = {
  name: 'System Administrator',
  email: 'admin@escrowtrust.com',
  password: 'Admin@123',
  role: 'ADMIN',
  phone: '0780000000',
  address: 'EscrowTrust HQ, Kigali, Rwanda',
  isKycVerified: true,
  kycVerifiedAt: new Date(),
};

const SELLER_DATA = {
  name: 'Alice Ishimwe',
  email: 'seller@escrowtrust.com',
  password: 'Seller@123',
  role: 'SELLER',
  phone: '0781111111',
  address: 'Kimihurura Estate, Kigali, Rwanda',
  isKycVerified: true,
  kycVerifiedAt: new Date(),
};

const BUYER_DATA = {
  name: 'Jospin Nabonyimana',
  email: 'buyer@escrowtrust.com',
  password: 'Buyer@123',
  role: 'BUYER',
  phone: '0782222222',
  address: 'Kiyovu Heights, Kigali, Rwanda',
  isKycVerified: true,
  kycVerifiedAt: new Date(),
};

const seed = async () => {
  try {
    // 1. Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    // 2. Sync schemas (Force clean start)
    await sequelize.sync({ force: true });
    console.log('✅ Models synchronized (database reset).');

    // 3. Create Users
    const admin = await User.create(ADMIN_DATA);
    const seller = await User.create(SELLER_DATA);
    const buyer = await User.create(BUYER_DATA);
    console.log('✅ Users successfully seeded:');
    console.log(`   - ADMIN : ${admin.email} (Password: Admin@123)`);
    console.log(`   - SELLER: ${seller.email} (Password: Seller@123)`);
    console.log(`   - BUYER : ${buyer.email} (Password: Buyer@123)`);

    // 4. Create Properties
    const prop1 = await Property.create({
      sellerId: seller.id,
      title: 'Kiyovu Luxury Villa',
      description: 'Exclusive 5-bedroom luxury estate featuring modern amenities, swimming pool, panoramic Kigali views, and high-end security fixtures.',
      price: 450000.00,
      location: 'Kiyovu, Kigali',
      bedrooms: 5,
      bathrooms: 4,
      area: 520.00,
      propertyType: 'VILLA',
      images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
      listingType: 'AUCTION',
      biddingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      upiCode: 'UPI-55-66-7788',
    });

    const prop2 = await Property.create({
      sellerId: seller.id,
      title: 'Kimihurura Heights Apartment',
      description: 'Modern 3-bedroom, 2-bathroom luxury apartment situated close to the city center. Features modular kitchen, high ceilings, and 2 dedicated parking bays.',
      price: 180000.00,
      location: 'Kimihurura, Kigali',
      bedrooms: 3,
      bathrooms: 2,
      area: 160.00,
      propertyType: 'APARTMENT',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
      listingType: 'FIXED_PRICE',
      upiCode: 'UPI-12-34-5678',
    });

    const prop3 = await Property.create({
      sellerId: seller.id,
      title: 'Gahanga Premium Land Plot',
      description: 'Prime commercial land plot measuring 1200 square meters, perfectly suited for logistics warehouses, shopping spaces, or office complex structures.',
      price: 280000.00,
      location: 'Gahanga, Kicukiro',
      bedrooms: 0,
      bathrooms: 0,
      area: 1200.00,
      propertyType: 'LAND',
      images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'],
      status: 'PENDING', // Set pending because it has an active transaction below
      listingType: 'FIXED_PRICE',
      upiCode: 'UPI-88-23-4019',
    });

    console.log('✅ Real estate listings seeded successfully.');

    // 5. Create a completed Transaction on prop2 (already sold)
    const compTransaction = await Transaction.create({
      propertyId: prop2.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: prop2.price,
      status: 'COMPLETED',
      verificationCode: '4321',
      buyerAuthorized: true,
      sellerAuthorized: true,
      depositDate: new Date(),
      mutationStartDate: new Date(),
      mutationEndDate: new Date(),
      releaseDate: new Date(),
      mutationDocuments: [{
        documentUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
        description: 'Approved Mutation Certificate #KIG-2026-88',
        uploadedAt: new Date(),
      }]
    });

    const compEscrow = await Escrow.create({
      transactionId: compTransaction.id,
      accountNumber: `ESC-ACC-${compTransaction.id}`,
      balance: 0.00, // released
      contractAddress: '0x' + require('crypto').createHash('sha256').update(`smart-contract-escrow-${compTransaction.id}`).digest('hex'),
      status: 'RELEASED',
      depositHistory: [{ amount: prop2.price, date: new Date(), reference: 'DEP-SEED-COMP', status: 'COMPLETED' }],
      releaseHistory: [{ amount: prop2.price, date: new Date(), reference: 'REL-SEED-COMP', status: 'COMPLETED' }]
    });

    await compTransaction.update({ escrowAccountId: compEscrow.id });
    await prop2.update({ status: 'SOLD' });

    // Seed audit logs for completed deal
    await AuditLog.create({ transactionId: compTransaction.id, userId: buyer.id, userName: buyer.name, userRole: buyer.role, action: 'TRANSACTION_INITIATED', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: buyer.id, userName: buyer.name, userRole: buyer.role, action: 'Buyer Jospin Nabonyimana approved state verification code 4321', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: seller.id, userName: seller.name, userRole: seller.role, action: 'Seller Alice Ishimwe approved state verification code 4321', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: buyer.id, userName: buyer.name, userRole: buyer.role, action: `Funds deposited: $${prop2.price} locked in escrow`, ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: seller.id, userName: seller.name, userRole: seller.role, action: 'Seller initiated ownership mutation', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: seller.id, userName: seller.name, userRole: seller.role, action: 'Seller uploaded document: Approved Mutation Certificate #KIG-2026-88', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: admin.id, userName: admin.name, userRole: admin.role, action: 'Mutation completed and submitted under review', ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });
    await AuditLog.create({ transactionId: compTransaction.id, userId: admin.id, userName: admin.name, userRole: admin.role, action: `Admin released funds: $${prop2.price} settled to Seller`, ipAddress: '127.0.0.1', userAgent: 'DB_SEEDER' });

    // 6. Create an Active Pending Transaction on prop3 (requires fresh timestamp)
    const transaction = await Transaction.create({
      propertyId: prop3.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: prop3.price,
      status: 'PENDING',
      verificationCode: '6789',
      buyerAuthorized: false,
      sellerAuthorized: false
    });

    // Create Escrow Account for transaction
    const escrow = await Escrow.create({
      transactionId: transaction.id,
      accountNumber: `ESC-ACC-${transaction.id}`,
      balance: 0.00,
      contractAddress: '0x' + require('crypto').createHash('sha256').update(`smart-contract-escrow-${transaction.id}`).digest('hex'),
      status: 'ACTIVE'
    });

    // Update transaction's escrow association reference
    await transaction.update({ escrowAccountId: escrow.id });

    // Seed first cryptographic log in Audit Trail
    await AuditLog.create({
      transactionId: transaction.id,
      userId: buyer.id,
      userName: buyer.name,
      userRole: buyer.role,
      action: 'TRANSACTION_INITIATED',
      ipAddress: '127.0.0.1',
      userAgent: 'DB_SEEDER',
    });

    console.log('✅ Completed mock Escrow Deal successfully pre-seeded (SOLD):');
    console.log(`   - Escrow contract address: ${compEscrow.contractAddress}`);
    console.log('✅ Active pending mock Escrow Deal successfully pre-seeded (PENDING):');
    console.log(`   - Escrow contract address: ${escrow.contractAddress}`);
    console.log(`   - Verified Consensus Code: 6789`);

    console.log('\n🎉 Seed complete! Start the backend server using: npm run dev');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
