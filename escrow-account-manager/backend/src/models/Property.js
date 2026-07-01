const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title is required' },
      len: { args: [2, 100], msg: 'Title cannot exceed 100 characters' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Description is required' },
    },
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Price must be greater than 0' },
    },
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Location is required' },
    },
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Bedrooms cannot be negative' },
    },
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Bathrooms cannot be negative' },
    },
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Area must be greater than 0' },
    },
  },
  propertyType: {
    type: DataTypes.ENUM('APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL', 'LAND'),
    allowNull: false,
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('AVAILABLE', 'PENDING', 'SOLD'),
    defaultValue: 'AVAILABLE',
  },
}, {
  timestamps: true,
});

module.exports = Property;
