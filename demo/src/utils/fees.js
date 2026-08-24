export const BUYER_FEE_RATE = 0.01;
export const SELLER_FEE_RATE = 0.015;

export function calculatePlatformFees(listPrice) {
  const price = Number(listPrice) || 0;
  const buyerFee = parseFloat((price * BUYER_FEE_RATE).toFixed(2));
  const sellerFee = parseFloat((price * SELLER_FEE_RATE).toFixed(2));
  return {
    price,
    buyerFee,
    sellerFee,
    buyerTotal: parseFloat((price + buyerFee).toFixed(2)),
    sellerNetPayout: parseFloat((price - sellerFee).toFixed(2)),
  };
}

export function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getRoleAwarePrice(listPrice, role) {
  const fees = calculatePlatformFees(listPrice);
  if (role === 'SELLER') {
    return { amount: fees.price, label: 'Your listing price', hint: `Net on completion: $${formatMoney(fees.sellerNetPayout)}` };
  }
  if (role === 'ADMIN') {
    return { amount: fees.price, label: 'Listing price', hint: `Buyer deposit $${formatMoney(fees.buyerTotal)} · Seller net $${formatMoney(fees.sellerNetPayout)}` };
  }
  return {
    amount: fees.buyerTotal,
    label: 'Total at escrow deposit',
    hint: `Listing $${formatMoney(fees.price)} + 1% fee ($${formatMoney(fees.buyerFee)})`,
  };
}
