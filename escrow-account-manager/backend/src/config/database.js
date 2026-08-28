const { Sequelize } = require('sequelize');
require('dotenv').config();

const isTestEnv = process.env.NODE_ENV === 'test';

const sequelize = isTestEnv
  ? new Sequelize('sqlite::memory:', { logging: false })
  : new Sequelize(
      process.env.DB_NAME || 'escrow_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'jospin123',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(isTestEnv ? 'SQLite in-memory test database connected.' : 'PostgreSQL connected successfully.');

    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('All models synchronized with database.');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
