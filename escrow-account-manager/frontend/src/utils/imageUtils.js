export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverUrl = apiUrl.replace(/\/api\/?$/, '');
  const cleanServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  let finalUrl = `${cleanServerUrl}${cleanUrl}`;
  
  // Append token for protected /uploads routes
  if (finalUrl.includes('/uploads/')) {
    const token = localStorage.getItem('token');
    if (token) {
      finalUrl += `?token=${token}`;
    }
  }
  
  return finalUrl;
};
