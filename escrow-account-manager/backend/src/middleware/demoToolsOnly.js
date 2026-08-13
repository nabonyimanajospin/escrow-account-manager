const { demoToolsEnabled } = require('../config/runtimeMode');

/** Blocks sandbox-only admin routes unless ENABLE_DEMO_TOOLS=true. */
const demoToolsOnly = (req, res, next) => {
  if (!demoToolsEnabled()) {
    return res.status(403).json({
      success: false,
      message: 'This action is disabled in production. Use live payment and registry integrations.',
    });
  }
  next();
};

module.exports = demoToolsOnly;
