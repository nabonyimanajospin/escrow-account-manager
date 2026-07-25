const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' },
      len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' },
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: { msg: 'Email already exists' },
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: { args: [8, 100], msg: 'Password must be at least 8 characters' },
    },
  },
  role: {
    type: DataTypes.ENUM('BUYER', 'SELLER', 'ADMIN'),
    allowNull: false,
    defaultValue: 'BUYER',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: { args: /^\+?[0-9]{10,15}$/, msg: 'Phone number must be between 10 and 15 digits, optionally starting with +' },
    },
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isKycVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  kycVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  walletBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  kycDocumentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// Instance method to verify password
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
