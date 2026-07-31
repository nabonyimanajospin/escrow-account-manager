import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../utils/imageUtils';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/SkeletonLoader';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/properties');
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
  const filteredProperties = properties.filter((p) => {
    if (p.status === 'SOLD') return false;
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
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-sans">Available Properties</h1>
        <p className="text-sm text-slate-500 mt-1 font-semibold">
          Browse real estate assets locked under secure three-way escrow agreements.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          {filteredProperties.map((p) => (
            <div key={p.id} className="card overflow-hidden flex flex-col justify-between bg-white h-[380px]">
              
              {/* Image & Price Area */}
              <div className="h-44 bg-slate-100 relative">
                {p.images && p.images[0] ? (
                  <img
                    src={resolveImageUrl(p.images[0])}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-semibold bg-slate-200/50">
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px] uppercase font-bold tracking-wider">No Image Reference</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={p.status} />
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white font-extrabold px-3 py-1 text-sm rounded-lg border border-slate-700">
                  ${Number(p.price).toLocaleString()}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
