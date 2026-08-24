import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { resolveImageUrl, getPropertyCoverImage, handlePropertyImageError } from '../utils/imageUtils';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { getRoleAwareListingPrice, formatMoney } from '../utils/platformFees';

const cardPriceBadgeSize = (amount) => {
  const text = formatMoney(amount);
  if (text.length > 11) return 'text-[11px]';
  if (text.length > 9) return 'text-xs';
  return 'text-sm';
};

const PropertyList = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('NEWEST');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/properties?status=AVAILABLE&limit=100');
        setProperties(response.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load property listings');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Filter application logic
  const filteredProperties = properties
    .filter((p) => {
      if (typeFilter !== 'ALL' && p.propertyType !== typeFilter) return false;
      if (locationFilter) {
        const query = locationFilter.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(query);
        const matchesLocation = p.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLocation) return false;
      }
      if (priceFilter) {
        const maxPrice = Number(priceFilter);
        if (Number(p.price) > maxPrice) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'PRICE_LOW_HIGH') return Number(a.price) - Number(b.price);
      if (sortOrder === 'PRICE_HIGH_LOW') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (loading) {
    return (
      <div className="page-wrapper space-y-6">
        <div className="h-10 w-48 bg-slate-200 rounded animate-pulse mb-1"></div>
        <div className="card p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
           <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
           <div className="h-10 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Title & Quick Category Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-sans">Available Properties</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            Browse available listings from all sellers on the platform.
          </p>
        </div>

        {/* Quick Type Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'HOUSE', 'VILLA', 'APARTMENT', 'LAND', 'COMMERCIAL'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                typeFilter === type
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="card p-4 bg-white grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="input-label">Property Type</label>
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="APARTMENT">Apartment</option>
            <option value="HOUSE">House</option>
            <option value="VILLA">Villa</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="LAND">Land</option>
          </select>
        </div>

        <div>
          <label className="input-label">Search Title or Location</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Kigali, Villa, Modern..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>

        <div>
          <label className="input-label">Maximum Price (USD)</label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g. 500000"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
          />
        </div>

        <div>
          <label className="input-label">Sort Order</label>
          <select
            className="input-field font-semibold"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="NEWEST">Newest Listings</option>
            <option value="PRICE_LOW_HIGH">Price: Low to High</option>
            <option value="PRICE_HIGH_LOW">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filteredProperties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="No property listings match your query parameters."
          actionText="Clear Filters"
          actionOnClick={() => { setTypeFilter('ALL'); setLocationFilter(''); setPriceFilter(''); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((p) => {
            const priceDisplay = getRoleAwareListingPrice(p.price, {
              role: user?.role,
              isOwner: user?.id === p.sellerId,
            });
            const coverImage = getPropertyCoverImage(p.images);
            return (
            <div key={p.id} className="card overflow-hidden flex flex-col justify-between bg-white h-[380px]">
              
              {/* Image & Price Area */}
              <div className="h-44 bg-slate-100 relative">
                <img
                  src={resolveImageUrl(coverImage)}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handlePropertyImageError}
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={p.status} />
                </div>
                <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] bg-slate-900/95 text-white px-3 py-2 rounded-lg border border-slate-700 shadow-md">
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-300 leading-tight">
                    {priceDisplay.label}
                  </span>
                  <span className={`block font-extrabold tabular-nums leading-snug mt-0.5 ${cardPriceBadgeSize(priceDisplay.amount)}`}>
                    ${formatMoney(priceDisplay.amount)}
                  </span>
                </div>
              </div>

              {/* Description Body */}
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-slate-900 truncate">{p.title}</h3>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{p.location}</p>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{p.description}</p>
                </div>

                {/* Specs row */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-bold mt-3">
                  <span className="flex items-center gap-1">
                    <span>Bedrooms:</span> <strong className="text-slate-800">{p.bedrooms}</strong>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <span>Bathrooms:</span> <strong className="text-slate-800">{p.bathrooms}</strong>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <span>Area:</span> <strong className="text-slate-800">{p.area} sqm</strong>
                  </span>
                </div>
              </div>

              {/* View details footer */}
              <Link
                to={`/properties/${p.id}`}
                className="bg-slate-50 border-t border-slate-100 text-center py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-primary-600 transition-colors"
              >
                View Property Details &rarr;
              </Link>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
