const requireKyc = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (!req.user.isKycVerified) {
    return res.status(403).json({
      success: false,
      message: 'KYC verification is required before using this escrow feature.',
    });
  }

  return next();
};

module.exports = requireKyc;
