import axios from '../api/axiosConfig';

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
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
