/**
 * seed.js — Database Seed Script
 * Creates a default ADMIN user for the Escrow Account Manager.
 *
 * Usage:  node seed.js
 *
 * This script is idempotent — running it multiple times will
 * NOT create duplicate admin accounts.
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

const ADMIN_DATA = {
  name: 'System Administrator',
  email: 'admin@escrowtrust.com',
  password: 'Admin@123',
  role: 'ADMIN',
  phone: '0780000000',
  address: 'EscrowTrust HQ, Kigali, Rwanda',
};

const seed = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized.');

    // Check if admin already exists
    const existing = await User.findOne({ where: { email: ADMIN_DATA.email } });
    if (existing) {
      console.log('⚠️  Admin user already exists. Skipping seed.');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Role:  ${existing.role}`);
    } else {
      const admin = await User.create(ADMIN_DATA);
      console.log('✅ Admin user created successfully!');
      console.log(`   Name:     ${admin.name}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: Admin@123`);
      console.log(`   Role:     ${admin.role}`);
    }

    console.log('\n🎉 Seed complete. You can now start the server with: npm run dev');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
