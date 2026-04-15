const rawApiUrl =
  process.env.REACT_APP_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:5000';

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
