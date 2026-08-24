const { Property, User, Transaction, Escrow } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { getLockedPropertyIds, ACTIVE_ESCROW_STATES } = require('../utils/propertyMarketplace');

/** Multipart forms send one image URL as a string; normalize to string[]. */
const normalizeImagesInput = (images) => {
  if (Array.isArray(images)) {
    return images.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof images === 'string' && images.trim()) {
    return images.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const buildFinalImages = (imagesInput, existingImages = [], uploadedFiles = []) => {
  const files = Array.isArray(uploadedFiles)
    ? uploadedFiles
    : uploadedFiles
      ? [uploadedFiles]
      : [];
  const uploadedPaths = files
    .filter(Boolean)
    .map((file) => `/uploads/properties/${file.filename}`);

  // If client sent explicit image URLs (even empty array), prefer that set + new uploads.
  // If images field omitted, keep existing gallery and prepend new uploads.
  const fromBody = imagesInput !== undefined
    ? normalizeImagesInput(imagesInput)
    : [...(existingImages || [])];

  // Deduplicate while preserving order (uploads first as newest cover candidates)
  const merged = [...uploadedPaths, ...fromBody];
  return [...new Set(merged.filter(Boolean))];
};

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

    const isSellerOrAdmin = req.user && (req.user.role === 'SELLER' || req.user.role === 'ADMIN');
    const lockedPropertyIds = await getLockedPropertyIds();

    const filteredRows = rows.filter((property) => {
      // Sellers/admins browsing their tools may see locked listings when not filtering to AVAILABLE only
      if (isSellerOrAdmin && status && status !== 'AVAILABLE') return true;

      if (property.status !== 'AVAILABLE') return false;
      if (lockedPropertyIds.has(property.id)) return false;
      return true;
    });

    res.status(200).json({
      success: true,
      count: filteredRows.length,
      total: filteredRows.length,
      totalPages: Math.ceil(filteredRows.length / limit) || 1,
      currentPage: page,
      data: filteredRows,
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
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const activeTxn = await Transaction.findOne({
      where: {
        propertyId: property.id,
        status: { [Op.in]: ACTIVE_ESCROW_STATES },
      },
    });

    const isListingOwner = req.user && req.user.id === property.sellerId;
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const isActiveBuyer = activeTxn && req.user && req.user.id === activeTxn.buyerId;
    const isPubliclyAvailable = property.status === 'AVAILABLE' && !activeTxn;

    if (!isPubliclyAvailable && !isListingOwner && !isAdmin && !isActiveBuyer) {
      return res.status(404).json({
        success: false,
        message: 'This property is no longer available on the public marketplace.',
      });
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

    // Platform supports fixed-price sales only (auction disabled)
    const finalListingType = 'FIXED_PRICE';

    if (!upiCode || !/^\d{1,2}\/\d{2}\/\d{2}\/\d{2}\/\d{1,5}$/i.test(upiCode)) {
      return res.status(400).json({ success: false, message: 'A valid Rwandan Land Registry UPI code is required (example: 1/03/01/04/3000)' });
    }

    const specs = normalizePropertySpecs({ propertyType, bedrooms, bathrooms, area });

    // Handle image upload — uploaded files first, then URL array from body
    const uploadedFiles = req.files?.length ? req.files : (req.file ? [req.file] : []);
    const finalImages = buildFinalImages(images, [], uploadedFiles);

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

    // Platform supports fixed-price sales only (auction disabled)
    const finalListingType = 'FIXED_PRICE';
    const finalBiddingDeadline = null;

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

    const uploadedFiles = req.files?.length ? req.files : (req.file ? [req.file] : []);
    const finalImages = buildFinalImages(images, property.images, uploadedFiles);

    await property.update({
      title: title !== undefined ? title : property.title,
      description: description !== undefined ? description : property.description,
      price: price !== undefined ? price : property.price,
      location: location !== undefined ? location : property.location,
      ...specs,
      propertyType: finalPropertyType,
      images: finalImages,
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
