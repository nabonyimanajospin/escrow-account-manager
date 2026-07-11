const { Property, User } = require('../models');

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
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const properties = await Property.findAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ success: true, count: properties.length, data: properties });
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

    res.status(200).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (SELLER, ADMIN)
exports.createProperty = async (req, res, next) => {
  try {
    const { title, description, price, location, bedrooms, bathrooms, area, propertyType, images } = req.body;

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

    const specs = normalizePropertySpecs({ propertyType, bedrooms, bathrooms, area });

    const property = await Property.create({
      sellerId: req.user.id,
      title,
      description,
      price,
      location,
      ...specs,
      propertyType,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
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

    const { title, description, price, location, bedrooms, bathrooms, area, propertyType, images } = req.body;
    const specs = normalizePropertySpecs({ propertyType, bedrooms, bathrooms, area });
    await property.update({
      title,
      description,
      price,
      location,
      ...specs,
      propertyType,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
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
        const { Transaction, EscrowAccount } = require('../models');
        const transactions = await Transaction.findAll({ where: { propertyId: property.id } });
        for (const txn of transactions) {
          if (txn.escrowAccountId) {
            await EscrowAccount.destroy({ where: { id: txn.escrowAccountId } });
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
