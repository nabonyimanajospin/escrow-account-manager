const { Property, User } = require('../models');

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

    if (!title || !description || !price || !location || !bedrooms || !bathrooms || !area || !propertyType) {
      return res.status(400).json({ success: false, message: 'Please provide all required property fields' });
    }

    const property = await Property.create({
      sellerId: req.user.id,
      title,
      description,
      price,
      location,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      images: images || [],
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

    // Cannot update a property that is in an active transaction
    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'Cannot update a property that is in an active transaction' });
    }

    await property.update(req.body);

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
      return res.status(400).json({ success: false, message: 'Cannot delete a property that is in an active transaction' });
    }

    await property.destroy();

    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};
