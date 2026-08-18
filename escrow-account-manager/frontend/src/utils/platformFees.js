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

/** Role-aware headline price for property cards and detail pages. */
export const getRoleAwareListingPrice = (listPrice, { role, isOwner } = {}) => {
  const fees = calculatePlatformFees(listPrice);

  if (isOwner) {
    return {
      amount: fees.price,
      label: 'Your listing price',
      hint: `Net on completion: $${formatMoney(fees.sellerNetPayout)} (after 1.5% platform fee)`,
    };
  }

  if (role === 'ADMIN') {
    return {
      amount: fees.price,
      label: 'Listing price',
      hint: `Buyer deposit: $${formatMoney(fees.buyerTotal)} · Seller net: $${formatMoney(fees.sellerNetPayout)}`,
    };
  }

  return {
    amount: fees.buyerTotal,
    label: 'Total at escrow deposit',
    hint: `Listing $${formatMoney(fees.price)} + 1% platform fee ($${formatMoney(fees.buyerFee)})`,
  };
};
