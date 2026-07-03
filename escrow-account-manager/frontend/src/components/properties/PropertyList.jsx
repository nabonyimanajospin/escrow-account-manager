import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const PropertyList = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/properties');
      setProperties(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
    const matchType   = !typeFilter   || p.propertyType === typeFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-wrapper space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Property Catalog</h1>
          <p className="text-slate-500 mt-1 text-sm">Browse and purchase listed real estate properties securely</p>
        </div>
        {user?.role === 'SELLER' && (
          <Link to="/properties/create" className="btn-primary text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            List New Property
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-grow relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field md:w-44">
          <option value="">All Types</option>
          <option value="HOUSE">House</option>
          <option value="APARTMENT">Apartment</option>
          <option value="VILLA">Villa</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="LAND">Land Plot</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field md:w-44">
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="PENDING">Pending</option>
          <option value="SOLD">Sold</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {properties.length} properties
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold">No properties match your search</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden flex flex-col group">

              {/* Image */}
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`${p.images?.[0] ? 'hidden' : ''} flex h-full items-center justify-center`}>
                  <svg className="w-14 h-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge status={p.status} />
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex-grow">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {p.location}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{p.description}</p>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-4">
                  <span>{p.bedrooms} Beds</span>
                  <span className="text-slate-300">|</span>
                  <span>{p.bathrooms} Baths</span>
                  <span className="text-slate-300">|</span>
                  <span>{p.area} sqft</span>
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Price</p>
                    <p className="text-xl font-extrabold text-slate-900">${Number(p.price).toLocaleString()}</p>
                  </div>
                  <Link to={`/properties/${p.id}`} className="btn-primary text-xs !px-4 !py-2">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
