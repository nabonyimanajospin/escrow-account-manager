/** Platform fee rates — must match backend (transactionController, offerController). */
export const BUYER_FEE_RATE = 0.01;
export const SELLER_FEE_RATE = 0.015;

export const calculatePlatformFees = (listPrice) => {
  const price = Number(listPrice) || 0;
  const buyerFee = parseFloat((price * BUYER_FEE_RATE).toFixed(2));
  const sellerFee = parseFloat((price * SELLER_FEE_RATE).toFixed(2));
  const buyerTotal = parseFloat((price + buyerFee).toFixed(2));
  const sellerNetPayout = parseFloat((price - sellerFee).toFixed(2));
  const platformRevenue = parseFloat((buyerFee + sellerFee).toFixed(2));

  return { price, buyerFee, sellerFee, buyerTotal, sellerNetPayout, platformRevenue };
};

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
