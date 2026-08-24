import axios from '../api/axiosConfig';

/** Reliable Unsplash cover used when a listing has no image URL. */
export const DEFAULT_PROPERTY_COVER =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';

/** Always-available local fallback (never depends on Unsplash / network). */
export const LOCAL_PROPERTY_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23e2e8f0'/%3E%3Cstop offset='1' stop-color='%23cbd5e1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='800' fill='url(%23g)'/%3E%3Cpath d='M350 480 V320 L600 180 L850 320 V480 H750 V400 H450 V480 Z' fill='%2394a3b8'/%3E%3Crect x='540' y='400' width='120' height='80' fill='%23e2e8f0'/%3E%3Ctext x='600' y='580' text-anchor='middle' fill='%2364748b' font-family='Arial,sans-serif' font-size='36' font-weight='700'%3EProperty Image%3C/text%3E%3C/svg%3E";

export const getPropertyCoverImage = (images) => {
  const first = Array.isArray(images)
    ? images.map((item) => String(item || '').trim()).find(Boolean)
    : typeof images === 'string'
      ? images.trim()
      : '';
  return first || DEFAULT_PROPERTY_COVER;
};

/** Attach to <img onError> so broken remote URLs fall back locally once. */
export const handlePropertyImageError = (event) => {
  const img = event?.currentTarget;
  if (!img || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = LOCAL_PROPERTY_PLACEHOLDER;
};

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverUrl = apiUrl.replace(/\/api\/?$/, '');
  const cleanServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;

  // Sensitive uploads require authenticated API file route
  const sensitiveMatch = cleanUrl.match(/^\/uploads\/(kyc|mutations|evidence|contracts)\/(.+)$/);
  if (sensitiveMatch) {
    const [, category, filename] = sensitiveMatch;
    return `${apiUrl}/files/${category}/${filename}`;
  }

  return `${cleanServerUrl}${cleanUrl}`;
};

/** Open sensitive uploads in a new tab using authenticated axios (Bearer + cookies). */
export const openSecureDocument = async (url) => {
  if (!url) return;

  const sensitiveMatch =
    url.match(/\/uploads\/(kyc|mutations|evidence|contracts)\/(.+)$/) ||
    url.match(/\/files\/(kyc|mutations|evidence|contracts)\/(.+)$/);

  if (sensitiveMatch) {
    const [, category, filename] = sensitiveMatch;
    const res = await axios.get(`/files/${category}/${filename}`, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(res.data);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return;
  }

  window.open(resolveImageUrl(url), '_blank', 'noopener,noreferrer');
};
