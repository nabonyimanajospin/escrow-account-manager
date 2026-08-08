const { Property, User, Transaction, Escrow } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const normalizePropertySpecs = ({ propertyType, bedrooms, bathrooms, area }) => {
  if (propertyType === 'LAND') {
    return {
      bedrooms: Number(bedrooms || 0),
      bathrooms: Number(bathrooms || 0),
      area: area || 1,
    };
  }

  return {
    bedrooms: Number(bedrooms),
    bathrooms: Number(bathrooms),
    area,
  };
};

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
exports.getProperties = async (req, res, next) => {
  try {
    const { Offer } = require('../models');
    const where = {};
    const { status, location, minPrice, maxPrice, propertyType, listingType, bedrooms } = req.query;

    if (status) where.status = status;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    if (propertyType) where.propertyType = propertyType;
    if (listingType) where.listingType = listingType;
    if (bedrooms) where.bedrooms = { [Op.gte]: parseInt(bedrooms) };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Property.findAndCountAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name'] },
        { model: Offer, as: 'offers', attributes: ['id', 'buyerId', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
      limit,
      offset,
    });

    // Filter out properties with active PENDING bids for general buyers browsing available listings
    const isSellerOrAdmin = req.user && (req.user.role === 'SELLER' || req.user.role === 'ADMIN');
    const filteredRows = rows.filter((property) => {
      if (isSellerOrAdmin) return true;
      // If filtering for available properties or general catalog, hide properties with active pending bids
      const hasActivePendingBid = Array.isArray(property.offers) && property.offers.some((o) => o.status === 'PENDING');
      if (hasActivePendingBid) return false;
      return true;
    });

    res.status(200).json({
      success: true,
      count: filteredRows.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: filteredRows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Private
exports.getProperty = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name'] }],
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.status(200).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current seller's own property listings (all statuses)
// @route   GET /api/properties/mine
// @access  Private (SELLER, ADMIN)
exports.getMyProperties = async (req, res, next) => {
  try {
    const where = { sellerId: req.user.id };

    const rows = await Property.findAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (SELLER, ADMIN)
exports.createProperty = async (req, res, next) => {
  try {
    const { title, description, price, location, bedrooms, bathrooms, area, propertyType, images, listingType, biddingDeadline, upiCode } = req.body;

    const isLand = propertyType === 'LAND';

    if (
      !title ||
      !description ||
      price === undefined ||
      price === null ||
      !location ||
      !propertyType ||
      (!isLand && (
        bedrooms === undefined ||
        bedrooms === null ||
        bathrooms === undefined ||
        bathrooms === null ||
        area === undefined ||
        area === null
      ))
    ) {
      return res.status(400).json({ success: false, message: 'Please provide all required property fields' });
    }

    const finalListingType = listingType === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE';

    if (!upiCode || !/^\d{1,2}\/\d{2}\/\d{2}\/\d{2}\/\d{1,5}$/i.test(upiCode)) {
      return res.status(400).json({ success: false, message: 'A valid Rwandan Land Registry UPI code is required (example: 1/03/01/04/3000)' });
    }

    if (finalListingType === 'AUCTION') {
      if (!biddingDeadline) {
        return res.status(400).json({ success: false, message: 'Please provide a bidding deadline for auction listings' });
      }
      if (new Date(biddingDeadline) <= new Date()) {
        return res.status(400).json({ success: false, message: 'Bidding deadline must be a future date' });
      }
    }

    const specs = normalizePropertySpecs({ propertyType, bedrooms, bathrooms, area });

    // Handle image upload — uploaded file takes priority; fallback to URL array from body
    let finalImages = Array.isArray(images) ? images.filter(Boolean) : [];
    if (req.file) {
      finalImages = [`/uploads/properties/${req.file.filename}`, ...finalImages];
    }

    const property = await Property.create({
      sellerId: req.user.id,
      title,
      description,
      price,
      location,
      ...specs,
      propertyType,
      images: finalImages,
      listingType: finalListingType,
      biddingDeadline: finalListingType === 'AUCTION' ? new Date(biddingDeadline) : null,
      upiCode: upiCode.toUpperCase(),
    });

    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (SELLER owner, ADMIN)
exports.updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Only the seller-owner can edit — admin has no business changing a seller's listing
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admins cannot edit property listings. Only the seller-owner can update their listing.' });
    }

    // Cannot update a property that is in an active transaction
    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'Cannot update a property that is in an active transaction' });
    }

    const { title, description, price, location, bedrooms, bathrooms, area, propertyType, images, listingType, biddingDeadline, upiCode } = req.body;

    const finalUpiCode = upiCode !== undefined ? upiCode : property.upiCode;
    if (!finalUpiCode || !/^\d{1,2}\/\d{2}\/\d{2}\/\d{2}\/\d{1,5}$/i.test(finalUpiCode)) {
      return res.status(400).json({ success: false, message: 'A valid Rwandan Land Registry UPI code is required (example: 1/03/01/04/3000)' });
    }

    const finalListingType = listingType !== undefined ? (listingType === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE') : property.listingType;
    const finalBiddingDeadline = biddingDeadline !== undefined ? biddingDeadline : property.biddingDeadline;

    if (finalListingType === 'AUCTION') {
      if (!finalBiddingDeadline) {
        return res.status(400).json({ success: false, message: 'Please provide a bidding deadline for auction listings' });
      }
      if (new Date(finalBiddingDeadline) <= new Date()) {
        return res.status(400).json({ success: false, message: 'Bidding deadline must be a future date' });
      }
    }

    const finalPropertyType = propertyType !== undefined ? propertyType : property.propertyType;
    const finalBedrooms = bedrooms !== undefined ? bedrooms : property.bedrooms;
    const finalBathrooms = bathrooms !== undefined ? bathrooms : property.bathrooms;
    const finalArea = area !== undefined ? area : property.area;

    const specs = normalizePropertySpecs({
      propertyType: finalPropertyType,
      bedrooms: finalBedrooms,
      bathrooms: finalBathrooms,
      area: finalArea
    });

    await property.update({
      title: title !== undefined ? title : property.title,
      description: description !== undefined ? description : property.description,
      price: price !== undefined ? price : property.price,
      location: location !== undefined ? location : property.location,
      ...specs,
      propertyType: finalPropertyType,
      images: Array.isArray(images) ? images.filter(Boolean) : property.images,
      listingType: finalListingType,
      biddingDeadline: finalListingType === 'AUCTION' ? new Date(finalBiddingDeadline) : null,
      upiCode: finalUpiCode.toUpperCase(),
    });

    res.status(200).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (SELLER owner, ADMIN)
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    if (property.status !== 'AVAILABLE') {
      if (req.user.role === 'ADMIN') {
        // Admin can only delete AVAILABLE or SOLD properties — not ones with active escrow
        const activeStates = ['PENDING'];
        if (activeStates.includes(property.status)) {
          return res.status(400).json({ success: false, message: 'Cannot delete a property that is in an active transaction. Resolve the transaction first.' });
        }
        // Admin force delete cascading to active transactions and escrow accounts
        const transactions = await Transaction.findAll({ where: { propertyId: property.id } });
        for (const txn of transactions) {
          if (txn.escrowAccountId) {
            await Escrow.destroy({ where: { id: txn.escrowAccountId } });
          }
          await txn.destroy();
        }
      } else {
        return res.status(400).json({ success: false, message: 'Cannot delete a property that is in an active transaction' });
      }
    }

    // Deleting a listing never deletes or disables the seller account.
    // The seller can still sign in and manage any other listings they own.
    await property.destroy();

    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const { generatePropertyDescription } = require('../services/aiService');

// @desc    Generate a property description using AI
// @route   POST /api/properties/ai-description
// @access  Private (SELLER)
exports.generateDescription = async (req, res, next) => {
  try {
    const { title, location, propertyType, price, area, bedrooms, bathrooms } = req.body;
    
    if (!title || !location || !propertyType || !price) {
      return res.status(400).json({ success: false, message: 'Title, location, type, and price are required for AI generation.' });
    }

    let description;
    try {
      description = await generatePropertyDescription({ title, location, propertyType, price, area, bedrooms, bathrooms });
    } catch (aiError) {
      logger.warn('Gemini AI description generation failed or key missing.');
      // Fallback description if AI fails
      description = `A fantastic ${propertyType.toLowerCase()} property located in ${location}. Priced competitively at $${price}, this property represents an excellent investment opportunity in the current market.`;
      if (propertyType !== 'LAND') {
        description += ` It features ${bedrooms} bedrooms and ${bathrooms} bathrooms.`;
      }
      description += ` Contact us today to learn more about ${title}!`;
    }

    res.status(200).json({ success: true, description });
  } catch (error) {
    next(error);
  }
};
