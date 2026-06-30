import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PropertyList = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/properties');
      setProperties(response.data.data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SOLD': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === '' || p.propertyType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-0">Property Catalog</h1>
          <p className="text-gray-500 mt-1">Browse and purchase listed real estate properties securely</p>
        </div>
        {user?.role === 'SELLER' && (
          <Link
            to="/properties/create"
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow-sm transition-all text-center cursor-pointer"
          >
            ➕ List New Property
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search by title, description or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          >
            <option value="">All Types</option>
            <option value="APARTMENT">Apartment</option>
            <option value="HOUSE">House</option>
            <option value="VILLA">Villa</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="LAND">Land Plot</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No listings match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((p) => (
            <div key={p._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Card Header (Placeholder image) */}
              <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                <span className="text-5xl">🏠</span>
                <span className={`absolute top-4 right-4 text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 border rounded-full ${getStatusBadge(p.status)}`}>
                  {p.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{p.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">📍 {p.location}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-2">{p.description}</p>
                </div>

                {/* Specs */}
                <div className="flex items-center space-x-4 text-xs font-semibold text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                  <span>🛏️ {p.bedrooms} Beds</span>
                  <span>🛁 {p.bathrooms} Baths</span>
                  <span>📏 {p.area} sqft</span>
                </div>

                {/* Price and Action */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Selling Price</p>
                    <p className="text-xl font-extrabold text-gray-900">${p.price?.toLocaleString()}</p>
                  </div>
                  <Link
                    to={`/properties/${p._id}`}
                    className="bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-all"
                  >
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
