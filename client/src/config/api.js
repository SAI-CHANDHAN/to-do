const isBrowser = typeof window !== 'undefined';
const isVercelHost = isBrowser && /\.vercel\.app$/i.test(window.location.hostname);

const configuredApiUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL;

const rawApiUrl = configuredApiUrl || (isVercelHost ? '/api' : 'http://localhost:5000');

const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
const isAbsoluteApiUrl = /^https?:\/\//i.test(normalizedApiUrl);

export const API_BASE_URL = normalizedApiUrl;

export const apiUrl = path => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!isAbsoluteApiUrl) {
    return normalizedPath;
  }

  return `${normalizedApiUrl}${normalizedPath}`;
};
