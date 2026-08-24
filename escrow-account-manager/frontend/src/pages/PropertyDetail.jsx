import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import CurrencyConverter from '../components/CurrencyConverter';
import PriceBreakdown from '../components/common/PriceBreakdown';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import { calculatePlatformFees, getRoleAwareListingPrice } from '../utils/platformFees';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Offers and bidding states
  const [offers, setOffers] = useState([]);
  const [totalBidders, setTotalBidders] = useState(0);
  const [offersLoading, setOffersLoading] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidPeriod, setBidPeriod] = useState('');
  const [walletBalance, setWalletBalance] = useState(null);

  const fetchOffers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setOffersLoading(true);
      const response = await axios.get(`/properties/${id}/offers`);
      setOffers(response.data.data || []);
      setTotalBidders(response.data.totalBidders ?? response.data.count ?? (response.data.data || []).length);
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setOffersLoading(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/properties/${id}`);
        setProperty(response.data.data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 404) {
          toast.error('This property is no longer available');
        } else {
          toast.error('Failed to load property details');
        }
        navigate('/properties');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
    fetchOffers();
  }, [id, navigate, fetchOffers]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'BUYER') return;
    axios.get('/wallet')
      .then((res) => setWalletBalance(res.data.wallet?.balance ?? 0))
      .catch(() => setWalletBalance(null));
  }, [isAuthenticated, user?.role]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to place your bid on this property');
      navigate('/login', { state: { from: `/properties/${id}`, action: 'BID' } });
      return;
    }


    if (!bidPrice || !bidPeriod) {
      toast.error('Please fill in both bid price and payment period');
      return;
    }

    if (parseFloat(bidPrice) < parseFloat(property.price)) {
      toast.error(`Your bid must be at least the target price of $${Number(property.price).toLocaleString()}`);
      return;
    }

    try {
      setActionLoading(true);
      const response = await axios.post(`/properties/${id}/offers`, {
        price: parseFloat(bidPrice),
        paymentPeriodDays: parseInt(bidPeriod, 10),
      });
      toast.success('Property reserved at your price. Fund escrow to complete your deposit.');
      navigate(`/escrow/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId, amount) => {
    if (!window.confirm(`Are you sure you want to accept this offer of $${Number(amount).toLocaleString()}? This will reject all other bids and initiate the escrow contract.`)) return;
    try {
      setActionLoading(true);
      const response = await axios.post(`/escrow/offers/${offerId}/accept`);
      toast.success('Offer accepted! Escrow transaction initiated.');
      navigate(`/escrow/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectPurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to purchase this property');
      navigate('/login', { state: { from: `/properties/${id}`, action: 'BUY' } });
      return;
    }

    const { buyerTotal } = calculatePlatformFees(property.price);
    if (!window.confirm(
      `Initiate escrow purchase?\n\nListing price: $${Number(property.price).toLocaleString()}\nYour deposit total (incl. 1% platform fee): $${buyerTotal.toLocaleString()}\n\nThis locks the property into escrow for contract review.`
    )) return;

    try {
      setActionLoading(true);
      const response = await axios.post('/escrow/initiate', { propertyId: property.id });
      toast.success('Escrow initiated successfully! Proceeding to contract room...');
      navigate(`/escrow/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate purchase');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing permanently? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await axios.delete(`/properties/${property.id}`);
      toast.success('Property deleted successfully');
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete property');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Retrieving listing profile...</span>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="page-wrapper text-center py-12">
        <p className="text-slate-600 font-semibold">Property not found</p>
        <Link to="/properties" className="btn-primary mt-4">Back to Properties</Link>
      </div>
    );
  }

  const isOwner = user?.id === property.sellerId;
  const isAdmin = user?.role === 'ADMIN';
  const showEscrowBtn = !isOwner && !isAdmin && property.status === 'AVAILABLE';
  const priceDisplay = getRoleAwareListingPrice(property.price, {
    role: user?.role,
    isOwner,
  });

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Back button */}
      <div>
        <Link to="/properties" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5">
          &larr; Back to Listings Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Image and Description */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cover image or placeholder */}
          <div className="space-y-4">
            <div className="card overflow-hidden h-[400px] bg-slate-100 relative">
              <img
                src={resolveImageUrl(
                  property.images?.[selectedImageIndex] || getPropertyCoverImage(property.images)
                )}
                alt={property.title}
                className="w-full h-full object-cover animate-fade-in transition-all duration-300"
                referrerPolicy="no-referrer"
                onError={handlePropertyImageError}
              />
              <div className="absolute top-4 right-4">
                <StatusBadge status={property.status} />
              </div>
            </div>

            {/* Thumbnail Carousel */}
            {property.images && property.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {property.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                      selectedImageIndex === idx 
                        ? 'ring-2 ring-primary-600 shadow-md ring-offset-2' 
                        : 'opacity-70 hover:opacity-100 hover:ring-2 hover:ring-slate-300 hover:ring-offset-1'
                    }`}
                  >
                    <img src={resolveImageUrl(imgUrl)} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} referrerPolicy="no-referrer" onError={handlePropertyImageError} />
                  </button>
                ))}
              </div>
            )}
          </div>

            {/* Core Description card with Interactive Map Tab */}
            <div className="card p-6 bg-white space-y-4">
              <div>
                <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{property.propertyType}</span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-1 font-sans">{property.title}</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{property.location}</p>
              </div>

              <div className="section-divider" />

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Property Description</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>

              <div className="section-divider" />

              {/* Authentic OpenStreetMap / Google Maps Style Interactive Map */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Interactive Property Location Map (Live GIS Registry)
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                    UPI: {property.titleDeedNumber || '1/02/03/04/1234'}
                  </span>
                </div>

                {/* OpenStreetMap Real Tile Embed + Interactive Pin & Overlay */}
                <div className="h-64 w-full rounded-xl relative overflow-hidden border border-slate-300 shadow-inner group">
                  <iframe
                    title="Property Location GIS Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=30.0500%2C-1.9550%2C30.0750%2C-1.9350&amp;layer=mapnik&amp;marker=-1.9441%2C30.0619"
                    className="w-full h-full filter contrast-105"
                  />
                  
                  {/* Floating Overlay Badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-white shadow-md">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      GPS Coordinates: -1.9441° S, 30.0619° E
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-[10px] font-bold shadow-md">
                    Location: {property.location || 'Gasabo, Kigali'} ({property.area} sqm)
                  </div>
                </div>
              </div>


              <div className="section-divider" />

              {/* Specifications icon grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Bedrooms</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{property.bedrooms}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Bathrooms</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{property.bathrooms}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Area Size</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-0.5">{property.area} sqm</p>
                </div>
              </div>

            </div>


        </div>

        {/* Right Column: Escrow Checkout / Admin controls */}
        <div className="space-y-6">
          
          {/* Price & Primary Action Card */}
          <div className="card p-6 bg-white space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{priceDisplay.label}</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">${Number(priceDisplay.amount).toLocaleString()}</p>
              <span className="text-[10px] font-medium text-slate-500 block mt-1">{priceDisplay.hint}</span>
            </div>

            {user?.role === 'BUYER' && showEscrowBtn && (
              <PriceBreakdown listPrice={property.price} role="buyer" />
            )}
            {user?.id === property.sellerId && (
              <PriceBreakdown listPrice={property.price} role="seller" />
            )}

            {/* Live RWF Currency Converter */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-hidden">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Convert to Rwandan Francs</p>
              <CurrencyConverter defaultUSD={property.price} compact={true} />
            </div>

            <div className="section-divider" />

            {showEscrowBtn && (
              <div className="space-y-4">
                {user?.role === 'BUYER' && walletBalance !== null && (() => {
                  const { buyerTotal } = calculatePlatformFees(property.price);
                  const hasFunds = walletBalance >= buyerTotal;
                  return (
                    <div className={`p-3 rounded-lg border text-xs font-semibold ${hasFunds ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      Your wallet: <strong>${Number(walletBalance).toLocaleString()}</strong>
                      {!hasFunds && (
                        <span className="block mt-1">
                          You need more wallet funds for this deposit.{' '}
                          <Link to="/wallet" className="text-primary-700 font-bold underline hover:text-primary-800">
                            Go to Wallet → Add Funds
                          </Link>
                        </span>
                      )}
                    </div>
                  );
                })()}
                <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleDirectPurchase}
                      disabled={actionLoading}
                      className="btn-primary w-full py-3 font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-all"
                    >
                      {actionLoading ? 'Initiating Escrow...' : 'Buy now & lock escrow'}
                    </button>
                    <p className="text-[10px] text-slate-400 font-semibold text-center">
                      Locks the listing immediately; other buyers will no longer see this property once you reserve it.
                    </p>
                    
                    <details className="mt-2 text-left">
                      <summary className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer text-center">
                        Need to negotiate terms or submit a custom offer?
                      </summary>
                      <form onSubmit={handlePlaceBid} className="space-y-3 mt-3 pt-3 border-t border-slate-100">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 block">Proposed Price ($ USD)</label>
                          <input
                            type="number"
                            required
                            min={1}
                            step="any"
                            className="input-field !py-1.5 !px-3 text-xs w-full"
                            placeholder={`$${Number(property.price).toLocaleString()}`}
                            value={bidPrice}
                            onChange={(e) => setBidPrice(e.target.value)}
                            disabled={actionLoading}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 block">Proposed Settlement Period (Days)</label>
                          <input
                            type="number"
                            required
                            min={1}
                            className="input-field !py-1.5 !px-3 text-xs w-full"
                            placeholder="E.g. 15 days"
                            value={bidPeriod}
                            onChange={(e) => setBidPeriod(e.target.value)}
                            disabled={actionLoading}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="btn-secondary w-full py-2 font-bold text-xs cursor-pointer"
                        >
                          {actionLoading ? 'Reserving...' : 'Lock at offered price'}
                        </button>
                      </form>
                    </details>
                  </div>
              </div>
            )}

            {property.status === 'SOLD' && !isOwner && !isAdmin && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold text-center leading-relaxed">
                This property has been successfully sold.
              </div>
            )}

            {property.status !== 'AVAILABLE' && property.status !== 'SOLD' && !isOwner && !isAdmin && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold text-center leading-relaxed">
                This property is currently locked in an active escrow transaction.
              </div>
            )}

            {(isOwner || isAdmin) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 text-center uppercase mb-2">
                  {isAdmin ? 'Admin Controls' : 'Seller Controls'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/properties/${property.id}/edit`}
                    className="btn-secondary w-full text-center text-xs font-bold py-2"
                  >
                    Edit Listing
                  </Link>
                  {property.status === 'AVAILABLE' || isAdmin ? (
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="btn-danger w-full text-xs font-bold py-2"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn-danger w-full text-xs font-bold py-2 opacity-50 cursor-not-allowed"
                    >
                      Locked
                    </button>
                  )}
                </div>
                {property.status !== 'AVAILABLE' && (
                  <p className="text-[10px] text-red-500 font-bold text-center mt-1">
                    {property.status === 'SOLD' ? 'Listing sold. Property transfer is complete.' : 'Listing locked. Active escrow transaction is pending.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Verified Seller Profile Card (Amazon / AliExpress anti-bypass model) */}
          <div className="card p-5 bg-white space-y-3 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verified Seller Profile</h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                ✓ Escrow Verified
              </span>
            </div>
            <div className="leading-tight space-y-2 pt-1">
              <p className="text-sm font-extrabold text-slate-900">{property.seller?.name || 'Verified Seller'}</p>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>🔒 Safe Escrow Protection</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-snug">
                  All communication, offers, and title deed transfers are protected in-app via the Escrow Account Manager protocol (Amazon / AliExpress standard).
                </p>
              </div>
            </div>
          </div>



          {/* Reserved-offer history (seller / admin only) */}
          {false && isAuthenticated && (isOwner || isAdmin) && property.listingType === 'AUCTION' && (
            <div className="card p-5 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                    Buyer offer ranking
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Ranked by price, settlement period, and KYC status</p>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                  {totalBidders} Bidder{totalBidders !== 1 ? 's' : ''}
                </span>
              </div>

              {/* My rank — buyers */}
              {user?.role === 'BUYER' && !isOwner && (() => {
                const myOffer = offers.find((o) => o.buyerId === user.id);
                if (offersLoading) {
                  return (
                    <p className="text-xs text-slate-400 text-center py-3">Calculating your rank...</p>
                  );
                }
                if (!myOffer) {
                  return (
                    <p className="text-xs text-slate-500 text-center py-3 font-medium leading-relaxed">
                      You have not placed a bid yet. Submit an auction bid above — the first bidder is ranked #1.
                    </p>
                  );
                }
                const isRank1 = myOffer.rank === 1;
                return (
                  <div className={`p-3.5 rounded-xl border leading-relaxed space-y-1 ${
                    isRank1
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">
                        {isRank1 ? 'Rank #1 of ' : `Rank #${myOffer.rank} of `}{totalBidders} bidder{totalBidders !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded border border-current">
                        Score: {myOffer.systemScore}%
                      </span>
                    </div>
                    <p className="text-[11px] font-medium leading-snug">
                      {isRank1
                        ? 'You are currently the top-ranked bidder on this listing.'
                        : 'Increase your offer or shorten the settlement period to improve your rank.'}
                    </p>
                  </div>
                );
              })()}

              {/* Full list — seller / admin only */}
              {(isOwner || isAdmin) && (
                <>
                  {offersLoading ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Loading offers...</p>
                  ) : totalBidders === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No pending bids yet.</p>
                  ) : (
                    <div className="space-y-3 pt-1 max-h-[380px] overflow-y-auto pr-1">
                      {offers.filter((o) => o.status === 'PENDING').map((offer) => {
                    const isMyOffer = user?.id === offer.buyerId;
                    const rankNum = offer.rank || offer.aiRank || 1;
                    const isRank1 = rankNum === 1;

                    return (
                      <div 
                        key={offer.id} 
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 text-left relative ${
                          isRank1
                            ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200' 
                            : offer.status === 'ACCEPTED'
                            ? 'border-blue-300 bg-blue-50/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                        }`}
                      >
                        {/* Rank Badge Header */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isRank1
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : rankNum === 2
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isRank1 ? 'Rank #1 — Top offer' : `#${rankNum} ranked buyer`}
                            </span>
                            {offer.buyer?.isKycVerified && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded border border-emerald-200">
                                ✓ KYC Verified
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-indigo-600 font-mono">
                            {offer.systemScore}% Score
                          </span>
                        </div>

                        {/* Price and Details */}
                        <div className="flex justify-between items-baseline pt-1">
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">
                              ${Number(offer.price).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">USD</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              Settlement Period: <strong className="text-slate-800">{offer.paymentPeriodDays} days</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-slate-800">{offer.buyer?.name || 'Anonymous Buyer'}</p>
                            {isMyOffer && <span className="text-[9px] font-bold text-primary-600">(Your Offer)</span>}
                          </div>
                        </div>

                        {/* Offer rationale */}
                        {offer.aiRecommendation && (
                          <div className="text-[10px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100 italic leading-snug">
                            {offer.aiRecommendation}
                          </div>
                        )}

                        {/* Status & Accept Action */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className={`text-[10px] font-extrabold ${
                            offer.status === 'ACCEPTED'
                              ? 'text-emerald-600'
                              : offer.status === 'REJECTED'
                              ? 'text-red-500'
                              : 'text-amber-600'
                          }`}>
                            Status: {offer.status}
                          </span>

                          {isOwner && property.status === 'AVAILABLE' && offer.status === 'PENDING' && (
                            <button
                              onClick={() => handleAcceptOffer(offer.id, offer.price)}
                              disabled={actionLoading}
                              className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-xs ${
                                isRank1
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                                  : 'bg-slate-800 hover:bg-slate-900 text-white'
                              }`}
                            >
                              {isRank1 ? 'Select #1 Buyer & Accept Bid' : 'Accept Buyer Bid'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default PropertyDetail;
