/**
 * Runtime mode helpers — production behavior is the default.
 * Set ENABLE_DEMO_TOOLS=true only for training / sandbox environments.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

const demoToolsEnabled = () => process.env.ENABLE_DEMO_TOOLS === 'true';

/** Enforce registry, documents, and buyer receipt before admin release. */
const strictReleaseChecks = () =>
  isProduction() || process.env.STRICT_RELEASE_CHECKS !== 'false';

module.exports = {
  isProduction,
  demoToolsEnabled,
  strictReleaseChecks,
};
