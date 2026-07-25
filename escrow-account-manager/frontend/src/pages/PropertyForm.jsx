import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PropertyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(isEditMode);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('HOUSE'); // APARTMENT, HOUSE, VILLA, COMMERCIAL, LAND
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [area, setArea] = useState('80');
  const [listingType, setListingType] = useState('FIXED_PRICE');
  const [biddingDeadline, setBiddingDeadline] = useState('');
  const [upiCode, setUpiCode] = useState('');
  const [imageInput, setImageInput] = useState(''); // Comma separated URLs
  const [uploadMode, setUploadMode] = useState('file'); // 'link' or 'file'
  const [imageFile, setImageFile] = useState(null);     // actual File object
  const [imagePreview, setImagePreview] = useState(''); // preview URL
  const [error, setError] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File is too large. Please select an image under 10MB.');
        e.target.value = '';
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (isEditMode) {
      const fetchProperty = async () => {
        try {
          const response = await axios.get(`/properties/${id}`);
          const p = response.data.data;
          
          // Verify that this user owns it (or is admin)
          if (p.sellerId !== user?.id && user?.role !== 'ADMIN') {
            toast.error('Not authorized to edit this property');
            navigate('/dashboard');
            return;
          }

          if (p.status !== 'AVAILABLE') {
            toast.error('Cannot edit a property locked in an active transaction');
            navigate(`/properties/${p.id}`);
            return;
          }

           setTitle(p.title);
          setDescription(p.description);
          setPrice(p.price);
          setLocation(p.location);
          setPropertyType(p.propertyType);
          setBedrooms(p.bedrooms);
          setBathrooms(p.bathrooms);
          setArea(p.area);
          setListingType(p.listingType || 'FIXED_PRICE');
          setBiddingDeadline(p.biddingDeadline ? new Date(p.biddingDeadline).toISOString().slice(0, 16) : '');
          setUpiCode(p.upiCode || '');

          const firstImage = p.images?.[0] || '';
          if (firstImage.startsWith('data:image')) {
            setUploadMode('file');
            setImagePreview(firstImage);
          } else {
            setUploadMode('link');
            setImageInput(p.images?.join(', ') || '');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load listing data');
          navigate('/dashboard');
        } finally {
          setFormLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, isEditMode, navigate, user]);

  const handleGenerateDescription = async () => {
    if (!title || !location || !propertyType || !price) {
      toast.error('Please fill in Title, Location, Property Type, and Price first.');
      return;
    }
    try {
      setIsGeneratingDesc(true);
      toast.loading('✨ AI is writing the description...', { id: 'ai-desc' });
      const res = await axios.post('/properties/ai-description', {
        title, location, propertyType, price, area, bedrooms, bathrooms
      });
      setDescription(res.data.description);
      toast.dismiss('ai-desc');
      toast.success('Description generated!');
    } catch (err) {
      toast.dismiss('ai-desc');
      toast.error(err.response?.data?.message || 'Failed to generate description');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !price || !location || !area) {
      setError('Please fill in all required fields');
      return;
    }

    if (Number(price) <= 0 || Number(area) <= 0) {
      setError('Price and Area must be positive numbers');
      return;
    }

    let imagesArray = [];
    if (uploadMode === 'link') {
      imagesArray = imageInput
        ? imageInput.split(',').map((url) => url.trim()).filter(Boolean)
        : [];
    }
    // If uploadMode === 'file', the image is sent as multipart via FormData

    const isLand = propertyType === 'LAND';

    try {
      setLoading(true);

      // Use FormData so Multer can receive the real image file
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', Number(price));
      formData.append('location', location);
      formData.append('propertyType', propertyType);
      formData.append('bedrooms', isLand ? 0 : Number(bedrooms));
      formData.append('bathrooms', isLand ? 0 : Number(bathrooms));
      formData.append('area', Number(area));
      formData.append('listingType', listingType);
      if (listingType === 'AUCTION' && biddingDeadline) formData.append('biddingDeadline', biddingDeadline);
      formData.append('upiCode', upiCode);
      imagesArray.forEach((url) => formData.append('images', url));
      if (uploadMode === 'file' && imageFile) {
        formData.append('image', imageFile); // field name Multer expects
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditMode) {
        await axios.put(`/properties/${id}`, formData, config);
        toast.success('Property listing updated successfully!');
      } else {
        await axios.post('/properties', formData, config);
        toast.success('Property listing published successfully!');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save property listing');
    } finally {
      setLoading(false);
    }
  };

  const isLand = propertyType === 'LAND';

  if (formLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Loading form template...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-3xl">
      
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 font-sans">
          {isEditMode ? 'Modify Property Listing' : 'Publish Property Listing'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-semibold">
          Create or edit house listings that buyers can contract online via escrow trust locks.
        </p>
      </div>

      {/* Card Form */}
      <div className="card p-8 bg-white border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Visual Selector for Property Type */}
          <div>
            <label className="input-label mb-2">Category Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {['APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL', 'LAND'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPropertyType(type)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold text-center cursor-pointer transition-all ${
                    propertyType === type
                      ? 'border-primary-600 bg-primary-50 text-primary-700 font-extrabold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Listing Category (Fixed vs Auction) and Land UPI Parcel ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label" htmlFor="listingType">Listing Category</label>
              <select
                id="listingType"
                className="input-field cursor-pointer"
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
                disabled={loading}
              >
                <option value="FIXED_PRICE">Fixed Price Sale</option>
                <option value="AUCTION">Bidding Auction Listing</option>
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="upiCode">Land Registry UPI Parcel ID</label>
              <input
                id="upiCode"
                type="text"
                required
                className="input-field font-mono"
                placeholder="UPI-12-34-5678"
                value={upiCode}
                onChange={(e) => setUpiCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            {listingType === 'AUCTION' && (
              <div>
                <label className="input-label" htmlFor="biddingDeadline">Bidding Deadline</label>
                <input
                  id="biddingDeadline"
                  type="datetime-local"
                  required
                  className="input-field"
                  value={biddingDeadline}
                  onChange={(e) => setBiddingDeadline(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Title and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label" htmlFor="title">Property Title</label>
              <input
                id="title"
                type="text"
                required
                className="input-field"
                placeholder="Modern 3-Bedroom Villa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="location">Physical Location</label>
              <input
                id="location"
                type="text"
                required
                className="input-field"
                placeholder="Kigali, Nyarutarama"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Price and Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label" htmlFor="price">Listing Price (USD Equivalent)</label>
              <input
                id="price"
                type="number"
                required
                className="input-field font-mono"
                placeholder="150000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="area">Land / Built Area (Square Meters)</label>
              <input
                id="area"
                type="number"
                required
                className="input-field font-mono"
                placeholder="250"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Bedrooms and Bathrooms (Hidden for LAND) */}
          {!isLand && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label" htmlFor="bedrooms">Bedrooms</label>
                <input
                  id="bedrooms"
                  type="number"
                  required
                  className="input-field"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="bathrooms">Bathrooms</label>
                <input
                  id="bathrooms"
                  type="number"
                  required
                  className="input-field"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label !mb-0" htmlFor="description">Listing Description</label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGeneratingDesc || loading}
                className="text-[10px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isGeneratingDesc ? '✨ Generating...' : '✨ Auto-Generate with AI'}
              </button>
            </div>
            <textarea
              id="description"
              required
              rows={4}
              className="input-field resize-none leading-relaxed"
              placeholder="Provide a detailed description of the property, structural features, and surrounding amenities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || isGeneratingDesc}
            />
          </div>

          {/* Image Selection Mode */}
          <div className="space-y-3">
            <label className="input-label font-bold text-slate-700">Property Photo Source</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUploadMode('link')}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  uploadMode === 'link'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Use Photo Link URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  uploadMode === 'file'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Upload Local File
              </button>
            </div>

            {uploadMode === 'link' ? (
              <div>
                <input
                  id="images"
                  type="text"
                  className="input-field text-xs font-mono"
                  placeholder="https://images.unsplash.com/photo-1..."
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  disabled={loading}
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Provide an external URL to a JPEG or PNG photo.
                </span>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-1.5 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-semibold
                    file:bg-slate-200 file:text-slate-700
                    hover:file:bg-slate-300 cursor-pointer"
                />
                {imagePreview ? (
                  <div className="mt-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Uploaded Preview</p>
                    <img
                      src={imagePreview}
                      alt="Property upload preview"
                      className="w-40 h-28 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    Select a local image file from your device (Max 2MB).
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary text-xs"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={loading}
            >
              {loading ? 'Saving Listing profile...' : isEditMode ? 'Update Listing' : 'Publish Listing'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default PropertyForm;
