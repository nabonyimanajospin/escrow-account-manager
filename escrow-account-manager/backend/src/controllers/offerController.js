const { Offer, Property, User, Transaction, Escrow, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const otpService = require('../services/otpService');
const notificationService = require('../services/notificationService');

// @desc    Place a bid/offer on a property
// @route   POST /api/properties/:id/offers
// @access  Private (BUYER)
exports.createOffer = async (req, res, next) => {
  try {
    const { price, paymentPeriodDays } = req.body;
    const propertyId = req.params.id;

    if (!price || !paymentPeriodDays) {
      return res.status(400).json({ success: false, message: 'Please provide offer price and payment period in days' });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'This property is not open for bidding' });
    }

    if (property.listingType !== 'AUCTION') {
      return res.status(400).json({ success: false, message: 'Bidding is only permitted for AUCTION listings' });
    }

    if (property.biddingDeadline && new Date() > new Date(property.biddingDeadline)) {
      return res.status(400).json({ success: false, message: 'Bidding deadline has passed for this property' });
    }

    if (property.sellerId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Sellers cannot place bids on their own listings' });
    }

    // Check for duplicate pending offer from this buyer
    const existingOffer = await Offer.findOne({
      where: {
        propertyId,
        buyerId: req.user.id,
        status: 'PENDING',
      }
    });
    if (existingOffer) {
      return res.status(400).json({ success: false, message: 'You already have an active pending bid on this listing' });
    }

    const targetPrice = parseFloat(property.price);
    const offerPrice = parseFloat(price);

    if (offerPrice < targetPrice) {
      return res.status(400).json({ 
        success: false, 
        message: `Your bid amount must be at least the target listing price of $${targetPrice.toLocaleString()}` 
      });
    }

    const offer = await Offer.create({
      propertyId,
      buyerId: req.user.id,
      price: offerPrice,
      paymentPeriodDays: Number(paymentPeriodDays),
      status: 'PENDING',
    });

    try {
      // Calculate System Rank to notify buyer
      const allOffers = await Offer.findAll({
        where: { propertyId },
        include: [{ model: User, as: 'buyer', attributes: ['id', 'isKycVerified'] }],
      });
      const rankedOffers = allOffers.map(o => {
        const oPrice = parseFloat(o.price);
        const days = o.paymentPeriodDays || 30;
        let systemScore = ((oPrice / targetPrice) * 100) - (days * 0.5);
        if (o.buyer && o.buyer.isKycVerified) systemScore += 5;
        return { id: o.id, systemScore: parseFloat(systemScore.toFixed(2)) };
      });
      rankedOffers.sort((a, b) => b.systemScore - a.systemScore);
      
      const rankIndex = rankedOffers.findIndex(o => o.id === offer.id);
      const rank = rankIndex + 1;
      
      const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      const rankText = getOrdinal(rank);

      await notificationService.createInAppNotification(
        req.user.id,
        'Bid Placed & AI Ranked',
        `Your offer of $${offerPrice.toLocaleString()} has been placed. You are currently AI Ranked #${rank} (${rankText} place) out of ${rankedOffers.length} buyer(s).`
      );
      await notificationService.createInAppNotification(
        property.sellerId,
        'New Buyer Offer Received (AI Ranked)',
        `A new offer of $${offerPrice.toLocaleString()} was placed. Check AI Buyer Rankings to pick your buyer.`
      );
    } catch (notifErr) {
      console.error('Failed to send bid notifications', notifErr);
    }

    res.status(201).json({ success: true, message: 'Bid successfully placed on property listing', data: offer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bids/offers for a property with system rank recommendation
// @route   GET /api/properties/:id/offers
// @access  Private
exports.getOffersByProperty = async (req, res, next) => {
  try {
    const propertyId = req.params.id;
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const offers = await Offer.findAll({
      where: { propertyId },
      include: [{ model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone', 'isKycVerified', 'walletBalance'] }],
      order: [['price', 'DESC']],
    });

    const targetPrice = parseFloat(property.price);

    // Compute System Matching Score for each offer
    // Score Formula: (Offer Price / Target Price) * 100 - (Payment Period Days * 0.5) + (KYC Verified ? 5 : 0)
    const rankedOffers = offers.map(o => {
      const oPrice = parseFloat(o.price);
      const days = o.paymentPeriodDays || 30;
      let systemScore = ((oPrice / targetPrice) * 100) - (days * 0.5);
      if (o.buyer && o.buyer.isKycVerified) {
        systemScore += 5;
      }
      systemScore = parseFloat(systemScore.toFixed(2));
      
      const offerJson = o.toJSON();
      offerJson.systemScore = systemScore;
      return offerJson;
    });

    // Sort by System Score descending
    rankedOffers.sort((a, b) => b.systemScore - a.systemScore);

    // Assign explicit integer rank (1, 2, 3...) and AI recommendation rationale
    rankedOffers.forEach((offer, index) => {
      const rankNum = index + 1;
      offer.rank = rankNum;
      offer.aiRank = rankNum;
      offer.isSystemChoice = (index === 0);
      
      if (index === 0) {
        offer.aiRecommendation = `🏆 Rank #1 Top AI Pick: Outstanding offer of $${Number(offer.price).toLocaleString()} with ${offer.paymentPeriodDays}-day settlement timeline.`;
      } else {
        offer.aiRecommendation = `Rank #${rankNum}: Offer of $${Number(offer.price).toLocaleString()} with ${offer.paymentPeriodDays}-day settlement timeline.`;
      }
    });

    res.status(200).json({ 
      success: true, 
      count: rankedOffers.length, 
      targetPrice, 
      data: rankedOffers 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller accepts offer (spawns transaction & escrow)
// @route   POST /api/escrow/offers/:id/accept
// @access  Private (SELLER owner)
exports.acceptOffer = async (req, res, next) => {
  try {
    const offerId = req.params.id;
    const offer = await Offer.findByPk(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This offer is no longer pending' });
    }

    const property = await Property.findByPk(offer.propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to accept offers on this property' });
    }

    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'Property listing is already locked' });
    }

    const bidPrice = parseFloat(offer.price);
    // Commission Splits: Buyer Fee = 1% extra, Seller Fee = 1.5% deduction
    const buyerFee = parseFloat((bidPrice * 0.010).toFixed(2));
    const sellerFee = parseFloat((bidPrice * 0.015).toFixed(2));

    const resultTransaction = await sequelize.transaction(async (t) => {
      // 1. Lock the property listing record to prevent double-selling race conditions
      const property = await Property.findByPk(offer.propertyId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!property) {
        throw new Error('Property not found');
      }
      if (property.status !== 'AVAILABLE') {
        throw new Error('Property listing is already locked');
      }

      // 2. Lock the offer record to confirm it is still pending
      const activeOffer = await Offer.findByPk(offerId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!activeOffer || activeOffer.status !== 'PENDING') {
        throw new Error('This offer is no longer pending');
      }

      // 3. Accept this offer
      activeOffer.status = 'ACCEPTED';
      await activeOffer.save({ transaction: t });

      // 4. Reject all other bids for this property
      await Offer.update(
        { status: 'REJECTED' },
        { 
          where: { 
            propertyId: property.id, 
            status: 'PENDING' 
          }, 
          transaction: t 
        }
      );

      // 5. Create the transaction
      const transaction = await Transaction.create({
        propertyId: property.id,
        buyerId: activeOffer.buyerId,
        sellerId: property.sellerId,
        amount: bidPrice,
        buyerFee,
        sellerFee,
        status: 'PENDING',
      }, { transaction: t });

      // 6. Create the Escrow Account
      const escrow = await Escrow.create({
        transactionId: transaction.id,
        balance: 0.00,
        status: 'ACTIVE',
      }, { transaction: t });

      // 7. Link Escrow back to Transaction
      await transaction.update({ escrowAccountId: escrow.id }, { transaction: t });

      // 8. Set Property status to PENDING
      await property.update({ status: 'PENDING' }, { transaction: t });

      // 8.5. Issue OTP to buyer to proceed
      const otp = await otpService.issueConsensusCode(transaction, t);
      const buyerUser = await User.findByPk(activeOffer.buyerId, { transaction: t });
      if (buyerUser) {
        await notificationService.sendConsensusCode({ user: buyerUser, transaction, ...otp });
      }

      // 9. Log to audit trail
      await AuditLog.create({
        transactionId: transaction.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: `Seller accepted buyer offer of $${bidPrice.toLocaleString()} (Buyer Fee: $${buyerFee}, Seller Fee: $${sellerFee}). Escrow spawned.`,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown Browser',
      }, { transaction: t });

      return transaction;
    });

    res.status(200).json({ success: true, message: 'Offer accepted successfully. Escrow transaction initiated.', data: resultTransaction });
  } catch (error) {
    next(error);
  }
};
