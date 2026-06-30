const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [1, 'Price must be greater than 0']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  bedrooms: {
    type: Number,
    required: [true, 'Please add number of bedrooms']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Please add number of bathrooms']
  },
  area: {
    type: Number,
    required: [true, 'Please add area in square feet']
  },
  propertyType: {
    type: String,
    enum: ['APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL', 'LAND'],
    required: true
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['AVAILABLE', 'PENDING', 'SOLD'],
    default: 'AVAILABLE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Property', PropertySchema);
