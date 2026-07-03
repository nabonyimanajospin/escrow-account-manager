import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

const PROPERTY_TYPES = [
  { value: 'HOUSE',      label: 'House',             icon: '🏠' },
  { value: 'APARTMENT',  label: 'Apartment',         icon: '🏢' },
  { value: 'VILLA',      label: 'Villa',             icon: '🏰' },
  { value: 'COMMERCIAL', label: 'Commercial',        icon: '🏗️' },
  { value: 'LAND',       label: 'Land Plot',         icon: '🌍' },
];

const EMPTY = { title: '', description: '', price: '', location: '', bedrooms: '', bathrooms: '', area: '', propertyType: 'HOUSE', images: [] };

const PropertyForm = () => {
  const { id } = useParams();           // present when editing
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState(EMPTY);
  const [imageInputs, setImageInputs] = useState(['']);  // URL inputs
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  // Load existing data when editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await axios.get(`/properties/${id}`);
        const p = res.data.data;
        setFormData({
          title:        p.title        || '',
          description:  p.description  || '',
          price:        p.price        || '',
          location:     p.location     || '',
          bedrooms:     p.bedrooms     || '',
          bathrooms:    p.bathrooms    || '',
          area:         p.area         || '',
          propertyType: p.propertyType || 'HOUSE',
          images:       p.images       || [],
        });
        // Populate URL inputs from existing images
        setImageInputs(p.images?.length ? [...p.images, ''] : ['']);
      } catch {
        toast.error('Could not load property data');
        navigate('/properties');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle URL input changes
  const handleUrlChange = (index, value) => {
    const updated = [...imageInputs];
    updated[index] = value;
    // Auto-add new empty input when last field is filled
    if (index === updated.length - 1 && value.trim()) updated.push('');
    setImageInputs(updated);
    // Sync to formData — only non-empty valid URLs
    setFormData((prev) => ({ ...prev, images: updated.filter((u) => u.trim()) }));
  };

  const removeImageUrl = (index) => {
    const updated = imageInputs.filter((_, i) => i !== index);
    if (updated.length === 0) updated.push('');
    setImageInputs(updated);
    setFormData((prev) => ({ ...prev, images: updated.filter((u) => u.trim()) }));
  };

  // Handle actual file upload — convert to base64 preview only, store as data URL
  // NOTE: For production you'd upload to Cloudinary/S3. Here we store data URLs.
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    }));
    const dataUrls = await Promise.all(readers);
    const updated = [...imageInputs.filter((u) => u.trim()), ...dataUrls, ''];
    setImageInputs(updated);
    setFormData((prev) => ({ ...prev, images: updated.filter((u) => u.trim()) }));
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, price, location, bedrooms, bathrooms, area } = formData;
    if (!title || !description || !price || !location || !bedrooms || !bathrooms || !area) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price:     Number(formData.price),
        bedrooms:  Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area:      Number(formData.area),
      };
      if (isEdit) {
        await axios.put(`/properties/${id}`, payload);
        toast.success('Property listing updated!');
        navigate(`/properties/${id}`);
      } else {
        const res = await axios.post('/properties', payload);
        toast.success('Property listing created!');
        navigate(`/properties/${res.data.data?.id || ''}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <LoadingSpinner text="Loading property data" />;

  return (
    <div className="page-wrapper max-w-3xl animate-slide-up">
      {/* Header */}
      <div className="mb-7">
        <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-3 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Property Listing' : 'List New Property'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isEdit ? 'Update your property details below.' : 'Fill in the details to list your property for secure escrow transactions.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">Basic Information</h2>

          <div>
            <label className="input-label">Property Title *</label>
            <input name="title" value={formData.title} onChange={handleChange} className="input-field" placeholder="e.g. Modern 4-Bedroom Villa in Kigali" required />
          </div>

          <div>
            <label className="input-label">Detailed Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input-field resize-none" rows="4" placeholder="Describe the property — rooms, features, location details, mutation conditions..." required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="input-field pl-7" placeholder="150000" min="1" required />
              </div>
            </div>
            <div>
              <label className="input-label">Location *</label>
              <input name="location" value={formData.location} onChange={handleChange} className="input-field" placeholder="e.g. Nyarutarama, Kigali" required />
            </div>
          </div>
        </div>

        {/* Property Type */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Property Type *</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setFormData({ ...formData, propertyType: t.value })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  formData.propertyType === t.value
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{t.icon}</div>
                <p className={`text-xs font-semibold ${formData.propertyType === t.value ? 'text-primary-700' : 'text-slate-600'}`}>{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Specs */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Property Specifications</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="input-label">Bedrooms *</label>
              <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="input-field" placeholder="4" min="0" required />
            </div>
            <div>
              <label className="input-label">Bathrooms *</label>
              <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="input-field" placeholder="2" min="0" required />
            </div>
            <div>
              <label className="input-label">Area (sq ft) *</label>
              <input type="number" name="area" value={formData.area} onChange={handleChange} className="input-field" placeholder="2500" min="1" required />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Property Photos</h2>

          {/* File upload */}
          <div className="mb-5">
            <label className="input-label">Upload from device</label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
              <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-500">Click to upload photos</p>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP supported</p>
              <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* URL inputs */}
          <div className="mb-4">
            <label className="input-label">Or add image URLs</label>
            <div className="space-y-2">
              {imageInputs.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url.startsWith('data:') ? '' : url}
                    onChange={(e) => handleUrlChange(i, e.target.value)}
                    className="input-field flex-grow"
                    placeholder={`https://example.com/photo-${i + 1}.jpg`}
                    disabled={url.startsWith('data:')}
                  />
                  {(url.trim() || imageInputs.length > 1) && (
                    <button type="button" onClick={() => removeImageUrl(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.images.length > 0 && (
            <div>
              <p className="input-label mb-2">Preview ({formData.images.length} photo{formData.images.length > 1 ? 's' : ''})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      alt={`Preview ${i + 1}`}
                      className="h-24 w-full rounded-xl object-cover border border-slate-200"
                      onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = imageInputs.filter((_, idx) => imageInputs[idx] !== img);
                        if (updated.length === 0) updated.push('');
                        setImageInputs(updated);
                        setFormData((prev) => ({ ...prev, images: updated.filter((u) => u.trim()) }));
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary !px-8">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isEdit ? 'Saving...' : 'Creating...'}
              </>
            ) : (isEdit ? 'Save Changes' : 'Create Listing')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;
