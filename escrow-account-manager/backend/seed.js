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
};

const SELLER_DATA = {
  name: 'Alice Ishimwe',
  email: 'seller@escrowtrust.com',
  password: 'Seller@123',
  role: 'SELLER',
  phone: '0781111111',
  address: 'Kimihurura Estate, Kigali, Rwanda',
};

const BUYER_DATA = {
  name: 'Jospin Nabonyimana',
  email: 'buyer@escrowtrust.com',
  password: 'Buyer@123',
  role: 'BUYER',
  phone: '0782222222',
  address: 'Kiyovu Heights, Kigali, Rwanda',
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
      status: 'AVAILABLE'
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
      status: 'AVAILABLE'
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
      status: 'PENDING' // Set pending because it has an active transaction below
    });

    console.log('✅ Real estate listings seeded successfully.');

    // 5. Create an Active Pending Transaction
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

    // 6. Create Escrow Account for transaction
    const escrow = await Escrow.create({
      transactionId: transaction.id,
      accountNumber: `ESC-ACC-${transaction.id}`,
      balance: 0.00,
      contractAddress: '0x' + require('crypto').createHash('sha256').update(`smart-contract-escrow-${transaction.id}`).digest('hex'),
      status: 'ACTIVE'
    });

    // Update transaction's escrow association reference
    await transaction.update({ escrowAccountId: escrow.id });

    // 7. Seed first cryptographic log in Audit Trail
    await AuditLog.create({
      transactionId: transaction.id,
      userId: buyer.id,
      userName: buyer.name,
      userRole: buyer.role,
      action: 'TRANSACTION_INITIATED'
    });

    console.log('✅ Active mock Escrow Deal successfully pre-seeded:');
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
