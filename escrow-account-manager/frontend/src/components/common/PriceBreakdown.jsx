import { calculatePlatformFees, formatMoney } from '../../utils/platformFees';

/**
 * Transparent fee breakdown for listings.
 * - Buyers see list price + 1% fee = total at deposit.
 * - Sellers see expected net payout after 1.5% platform fee.
 */
const PriceBreakdown = ({ listPrice, role = 'buyer', compact = false }) => {
  const fees = calculatePlatformFees(listPrice);
  if (!fees.price) return null;

  if (role === 'seller') {
    return (
      <div className={`rounded-lg border border-emerald-200 bg-emerald-50/80 ${compact ? 'p-2.5' : 'p-3'} space-y-1.5`}>
        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Your expected payout</p>
        <div className="flex justify-between text-xs text-emerald-900">
          <span>Listing price</span>
          <span className="font-semibold">${formatMoney(fees.price)}</span>
        </div>
        <div className="flex justify-between text-xs text-emerald-700">
          <span>Platform fee (1.5%)</span>
          <span>-${formatMoney(fees.sellerFee)}</span>
        </div>
        <div className="flex justify-between text-sm font-extrabold text-emerald-900 pt-1 border-t border-emerald-200">
          <span>Net on completion</span>
          <span>${formatMoney(fees.sellerNetPayout)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-indigo-200 bg-indigo-50/80 ${compact ? 'p-2.5' : 'p-3'} space-y-1.5`}>
      <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
        {compact ? 'Buyer total at deposit' : 'What you pay at escrow deposit'}
      </p>
      <div className="flex justify-between text-xs text-indigo-900">
        <span>Seller listing price</span>
        <span className="font-semibold">${formatMoney(fees.price)}</span>
      </div>
      <div className="flex justify-between text-xs text-indigo-700">
        <span>Platform security charge (1.0%)</span>
        <span>+${formatMoney(fees.buyerFee)}</span>
      </div>
      <div className="flex justify-between text-sm font-extrabold text-indigo-900 pt-1 border-t border-indigo-200">
        <span>Total escrow deposit</span>
        <span>${formatMoney(fees.buyerTotal)}</span>
      </div>
      <p className="text-[10px] text-indigo-600/90 leading-snug">
        The listing price is set by the seller. Your deposit includes the buyer fee so the platform can secure the deal.
      </p>
    </div>
  );
};

export default PriceBreakdown;
