import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmModal from '../common/ConfirmModal';
import StatusBadge from '../common/StatusBadge';

const PropertyTypeBadge = ({ type }) => {
  const labels = { HOUSE: 'House', APARTMENT: 'Apartment', VILLA: 'Villa', LAND: 'Land', COMMERCIAL: 'Commercial' };
  return <span className="text-sm text-slate-500">{labels[type] || type}</span>;
};

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => { fetchProperty(); }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/properties/${id}`);
      setProperty(res.data.data);
    } catch {
      toast.error('Unable to load property details');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateTransaction = async () => {
    try {
      setActionLoading(true);
      const res = await axios.post('/transactions/initiate', { propertyId: property.id });
      toast.success('Transaction started. Proceed to confirm the deposit.');
      navigate(`/transactions/${res.data.data?.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await axios.delete(`/properties/${id}`);
      toast.success('Property listing removed');
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete property');
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading property details" />;
  if (!property) return null;

  const canManage = user?.role === 'ADMIN' || user?.id === property.sellerId;
  const canBuy    = user?.role === 'BUYER' && property.status === 'AVAILABLE';
  const images    = property.images?.filter(Boolean) || [];

  return (
    <div className="page-wrapper space-y-6 animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/properties" className="text-primary-600 hover:text-primary-700 font-medium">Properties</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500 truncate max-w-xs">{property.title}</span>
      </div>

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{property.title}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {property.location}
          </p>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_0.7fr] gap-6">

        {/* Left */}
        <div className="space-y-5">

          {/* Image gallery */}
          <div className="card overflow-hidden">
            {images.length > 0 ? (
              <>
                <div className="relative h-72 sm:h-96 bg-slate-100">
                  <img
                    src={images[activeImg]}
                    alt={property.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center bg-slate-50">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setActiveImg((activeImg - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors">
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button onClick={() => setActiveImg((activeImg + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors">
                        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setActiveImg(i)}
                            className={`h-2 rounded-full transition-all ${i === activeImg ? 'bg-primary-500 w-4' : 'bg-white/70 w-2'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activeImg ? 'border-primary-500' : 'border-transparent'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-64 bg-slate-50 flex flex-col items-center justify-center gap-3">
                <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-slate-400">No photos uploaded</p>
              </div>
            )}
          </div>

          {/* Description + specs */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">About this property</h2>
            <p className="text-slate-600 leading-relaxed">{property.description}</p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Bedrooms',  value: property.bedrooms },
                { label: 'Bathrooms', value: property.bathrooms },
                { label: 'Area',      value: `${property.area} sqft` },
              ].map((spec) => (
                <div key={spec.label} className="bg-slate-50 border border-slate-200 p-4 text-center rounded-xl">
                  <p className="text-lg font-bold text-slate-900">{spec.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{spec.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">

          {/* Price + actions */}
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Selling Price</p>
            <p className="text-4xl font-extrabold text-slate-900 mb-1">${Number(property.price).toLocaleString()}</p>
            <p className="text-sm text-slate-500 mb-5">
              <PropertyTypeBadge type={property.propertyType} /> · {property.location}
            </p>

            <div className="space-y-3">
              {canBuy && (
                <button onClick={handleInitiateTransaction} disabled={actionLoading} className="btn-primary w-full !py-3">
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Initiate Escrow Transaction
                    </>
                  )}
                </button>
              )}

              {!canBuy && user?.role === 'BUYER' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
                  This property is not currently available for purchase.
                </div>
              )}

              {!user && (
                <Link to="/login" className="btn-primary w-full !py-3 text-center block">
                  Sign in to Purchase
                </Link>
              )}

              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Link to={`/properties/${property.id}/edit`} className="btn-secondary flex-1 text-center text-sm">
                    Edit Listing
                  </Link>
                  <button onClick={() => setConfirmOpen(true)} className="btn-danger flex-1 text-sm">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Seller info */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Seller Information</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-sm">
                {property.seller?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{property.seller?.name || 'Unknown'}</p>
                <span className="badge badge-role-seller text-[10px]">SELLER</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {property.seller?.email || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {property.seller?.phone || 'N/A'}
              </div>
            </div>
          </div>

          {/* Escrow notice */}
          <div className="card-tinted p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-800">Escrow Protected</p>
                <p className="text-xs text-primary-700 mt-0.5 leading-relaxed">
                  Funds are locked in escrow until the seller completes verified property mutation. Zero fraud risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete property listing"
        message="This will permanently remove the listing from the catalog. This action cannot be undone."
        confirmText="Delete Listing"
        danger
        loading={actionLoading}
      />
    </div>
  );
};

export default PropertyDetail;
