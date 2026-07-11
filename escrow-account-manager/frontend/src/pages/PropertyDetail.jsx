import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/properties/${id}`);
        setProperty(response.data.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load property details');
        navigate('/properties');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id, navigate]);

  const handleBuy = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to buy a property');
      navigate('/login');
      return;
    }

    if (user?.role !== 'BUYER') {
      toast.error('Only buyers can initiate escrow transactions');
      return;
    }

    if (!window.confirm(`Do you want to initiate a secure escrow agreement to purchase "${property.title}" for $${Number(property.price).toLocaleString()}?`)) return;

    try {
      setActionLoading(true);
      const response = await axios.post('/escrow/initiate', { propertyId: property.id });
      toast.success('Escrow transaction initiated successfully!');
      navigate(`/escrow/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate transaction');
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
  const showEscrowBtn = user?.role === 'BUYER' && property.status === 'AVAILABLE';

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
          <div className="card overflow-hidden h-[400px] bg-slate-100 relative">
            {property.images && property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-semibold bg-slate-200/50">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs uppercase font-bold tracking-widest">No Image Uploaded</span>
              </div>
            )}
            <div className="absolute top-4 right-4">
              <StatusBadge status={property.status} />
            </div>
          </div>

          {/* Core Description card */}
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secured Listing Price</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">${Number(property.price).toLocaleString()}</p>
              <span className="text-[10px] font-mono text-slate-400 block mt-1">Currency: USD Equivalent</span>
            </div>

            <div className="section-divider" />

            {showEscrowBtn && (
              <button
                onClick={handleBuy}
                disabled={actionLoading}
                className="btn-primary w-full py-3 font-bold"
              >
                {actionLoading ? 'Initializing Protocol...' : 'Buy via Secure Escrow'}
              </button>
            )}

            {property.status !== 'AVAILABLE' && !isOwner && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold text-center leading-relaxed">
                This property is currently locked in an active escrow transaction or has been sold.
              </div>
            )}

            {isOwner && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 text-center uppercase mb-2">Seller Controls</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/properties/${property.id}/edit`}
                    className="btn-secondary w-full text-center text-xs font-bold py-2"
                  >
                    Edit Listing
                  </Link>
                  {property.status === 'AVAILABLE' ? (
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
                  <p className="text-[10px] text-red-500 font-bold text-center mt-1">Listing locked. Active escrow transaction is pending.</p>
                )}
              </div>
            )}
          </div>

          {/* Seller Metadata Card */}
          <div className="card p-5 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listing Seller Profile</h3>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800">{property.seller?.name || 'Unknown Seller'}</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{property.seller?.email || 'N/A'}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{property.seller?.phone || 'N/A'}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default PropertyDetail;
