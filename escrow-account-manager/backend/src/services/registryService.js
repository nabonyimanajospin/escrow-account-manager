const MOCK_REGISTRY_DATABASE = {
  'UPI-12-34-5678': { owner: 'Alice Ishimwe', parcelTitle: 'Kimihurura Heights Apartment', status: 'CLEAN', area: 160.00 },
  'UPI-55-66-7788': { owner: 'Alice Ishimwe', parcelTitle: 'Kiyovu Luxury Villa', status: 'CLEAN', area: 520.00 },
  'UPI-88-23-4019': { owner: 'Alice Ishimwe', parcelTitle: 'Gahanga Premium Land Plot', status: 'CLEAN', area: 1200.05 },
};

const lookupParcel = async (upiCode) => {
  const provider = process.env.REGISTRY_PROVIDER || 'mock';

  if (process.env.NODE_ENV === 'production' && provider === 'mock') {
    throw new Error('Real land registry provider is not configured');
  }

  if (provider === 'mock') {
    return MOCK_REGISTRY_DATABASE[String(upiCode || '').toUpperCase()] || null;
  }

  // Adapter seam: call official registry API here using REGISTRY_API_URL/API_KEY.
  return null;
};

module.exports = {
  lookupParcel,
};
