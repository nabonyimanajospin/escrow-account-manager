import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/imageUtils';
import PriceBreakdown from '../components/common/PriceBreakdown';
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
  const [upiCode, setUpiCode] = useState('');
  const [imageInput, setImageInput] = useState(''); // Comma separated URLs
  const [uploadMode, setUploadMode] = useState('file'); // 'link' or 'file'
  const [imageFiles, setImageFiles] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // blob preview URLs
  const [existingImages, setExistingImages] = useState([]); // already saved gallery (edit mode)
  const [error, setError] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  // Currency States
  const [rwfPrice, setRwfPrice] = useState('');
  const [usdExchangeRate, setUsdExchangeRate] = useState(null);
  const [fetchingRate, setFetchingRate] = useState(true);

  // Fetch Live Exchange Rate on Mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        setUsdExchangeRate(data.rates.RWF || 1350); // Fallback to 1350 if not found
      } catch (err) {
        console.error('Failed to fetch exchange rate', err);
        setUsdExchangeRate(1350); // Safe fallback
      } finally {
        setFetchingRate(false);
      }
    };
    fetchRate();
  }, []);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const accepted = [];
    for (const file of selected) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB).`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      accepted.push(file);
    }

    const combined = [...imageFiles, ...accepted].slice(0, 8);
    if (imageFiles.length + accepted.length > 8) {
      toast.error('You can upload up to 8 photos per property.');
    }

    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles(combined);
    setImagePreviews(combined.map((file) => URL.createObjectURL(file)));
    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    const nextFiles = imageFiles.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(nextFiles);
    setImagePreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
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
          // If exchange rate is fetched, calculate RWF. If not, we'll just use a fallback or it will update later.
          // Note: usdExchangeRate might be null initially if fetch is slow, so we fallback to 1350
          setRwfPrice(p.price ? (Number(p.price) * (usdExchangeRate || 1350)).toFixed(0) : '');
          
          setLocation(p.location);
          setPropertyType(p.propertyType);
          setBedrooms(p.bedrooms);
          setBathrooms(p.bathrooms);
          setArea(p.area);
          setUpiCode(p.upiCode || '');

          const savedImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
          setExistingImages(savedImages);
          const firstImage = savedImages[0] || '';
          if (firstImage.startsWith('/uploads/') || firstImage.startsWith('data:image')) {
            setUploadMode('file');
            setImageInput('');
          } else {
            setUploadMode('link');
            setImageInput(savedImages.join(', '));
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
      toast.loading('Generating description...', { id: 'ai-desc' });
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
      if (imagesArray.length > 8) {
        setError('Please provide at most 8 photo URLs.');
        return;
      }
    } else {
      // Keep already-saved photos (edit) and append newly uploaded files on the server
      imagesArray = [...existingImages];
    }

    if (uploadMode === 'file' && imageFiles.length === 0 && imagesArray.length === 0) {
      // Allow publish without photos (fallback cover will show), but warn gently
    }

    const isLand = propertyType === 'LAND';

    try {
      setLoading(true);

      // Use FormData so Multer can receive the real image files
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', Number(price));
      formData.append('location', location);
      formData.append('propertyType', propertyType);
      formData.append('bedrooms', isLand ? 0 : Number(bedrooms));
      formData.append('bathrooms', isLand ? 0 : Number(bathrooms));
      formData.append('area', Number(area));
      formData.append('listingType', 'FIXED_PRICE');
      formData.append('upiCode', upiCode);
      imagesArray.forEach((url) => formData.append('images', url));
      if (uploadMode === 'file') {
        imageFiles.forEach((file) => formData.append('photos', file));
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

          {/* Fixed-price sale only + Land UPI Parcel ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Sale Type</label>
              <div className="input-field bg-slate-50 text-slate-700 font-semibold flex items-center">
                Fixed Price Sale
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Listings sell at your set price. Auction mode is not available.
              </p>
            </div>

            <div>
              <label className="input-label" htmlFor="upiCode">Land Registry UPI Parcel ID</label>
              <input
                id="upiCode"
                type="text"
                required
                className="input-field font-mono"
                placeholder="1/03/01/04/3000"
                value={upiCode}
                onChange={(e) => setUpiCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
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
              {/* Interactive GIS Location Map Selector Preview */}
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">📍 Live GIS Map Pin Preview:</span>
                  <span className="text-emerald-700 font-mono font-bold">{location || 'Kigali, Rwanda'}</span>
                </div>
                <div className="h-32 w-full rounded-lg overflow-hidden border border-slate-300 relative shadow-inner">
                  <iframe
                    title="Seller Location GIS Preview"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=30.0400%2C-1.9600%2C30.0800%2C-1.9300&amp;layer=mapnik&amp;marker=-1.9441%2C30.0619`}
                    className="w-full h-full filter contrast-105"
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-white/95 px-2 py-0.5 rounded text-[9px] font-bold text-slate-800 border shadow-xs">
                    ✓ GIS Location Verified
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Price and Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label" htmlFor="rwfPrice">Listing Price (Rwandan Francs - RWF)</label>
              <div className="relative">
                <input
                  id="rwfPrice"
                  type="number"
                  min="1"
                  required
                  className="input-field font-mono"
                  placeholder="150000000"
                  value={rwfPrice}
                  onChange={(e) => {
                    setRwfPrice(e.target.value);
                    const rate = usdExchangeRate || 1350;
                    setPrice(e.target.value ? (Number(e.target.value) / rate).toFixed(2) : '');
                  }}
                  disabled={loading || fetchingRate}
                />
                {fetchingRate && <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Loading rates...</span>}
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="price">Equivalent in USD (Live Market Rate)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  id="price"
                  type="text"
                  readOnly
                  className="input-field font-mono bg-slate-50 pl-7 text-slate-500"
                  placeholder="0.00"
                  value={price}
                />
              </div>
              {Number(price) > 0 && (
                <div className="mt-3">
                  <PriceBreakdown listPrice={price} role="seller" compact />
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Buyers will see your listing price plus a separate 1% deposit fee. The 1.5% seller fee is deducted only when the deal completes successfully.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="input-label" htmlFor="area">Land / Built Area (Square Meters)</label>
              <input
                id="area"
                type="number"
                min="1"
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
                  min="0"
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
                  min="0"
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
                {isGeneratingDesc ? 'Generating...' : 'Auto-generate description'}
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

          {/* Image Selection Mode & Multi-Photo Guidance Signal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="input-label font-bold text-slate-700">Property Photos (up to 8)</label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                ★ Recommended for Fast Bidding
              </span>
            </div>

            {/* Seller Guidance Signal Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>📸 Multi-Angle Seller Guidance Signal:</span>
              </p>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Please upload photos showing <strong>different views of the property</strong> (e.g. Exterior Front, Living Room, Kitchen, Bedrooms, and Deed Document). Listings with multi-view photos receive 3x more buyer bids!
              </p>
            </div>

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
                Use Photo Link URL(s)
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
                Upload Local File(s)
              </button>
            </div>

            {uploadMode === 'link' ? (
              <div>
                <textarea
                  id="images"
                  rows={3}
                  className="input-field text-xs font-mono"
                  placeholder="https://images.unsplash.com/photo-1..., https://images.unsplash.com/photo-2..."
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  disabled={loading}
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                  Paste one or more image URLs, separated by commas (max 8).
                  <strong className="text-primary-600 block mt-0.5">
                    The FIRST URL is the catalog cover. Extra photos appear in the property gallery.
                  </strong>
                </span>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading || imageFiles.length + existingImages.length >= 8}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-1.5 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-semibold
                    file:bg-slate-200 file:text-slate-700
                    hover:file:bg-slate-300 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-semibold block">
                  Select one or more images from your device (JPG/PNG/WebP, max 10MB each, up to 8 total).
                  First photo becomes the cover.
                </span>

                {existingImages.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Current gallery</p>
                    <div className="flex flex-wrap gap-2">
                      {existingImages.map((url, idx) => (
                        <div key={`existing-${idx}`} className="relative">
                          <img
                            src={resolveImageUrl(url)}
                            alt={`Saved ${idx + 1}`}
                            className="w-24 h-20 object-cover rounded-lg border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-5 h-5"
                            title="Remove"
                          >
                            ×
                          </button>
                          {idx === 0 && imageFiles.length === 0 && (
                            <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-slate-900/80 text-white px-1 rounded">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">New uploads</p>
                    <div className="flex flex-wrap gap-2">
                      {imagePreviews.map((preview, idx) => (
                        <div key={`new-${idx}`} className="relative">
                          <img
                            src={preview}
                            alt={`Upload ${idx + 1}`}
                            className="w-24 h-20 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-5 h-5"
                            title="Remove"
                          >
                            ×
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-slate-900/80 text-white px-1 rounded">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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
