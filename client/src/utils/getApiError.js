const getApiError = err =>
  err.response?.data?.message ||
  err.response?.data?.msg ||
  err.response?.data?.errors?.[0]?.message ||
  err.response?.data?.errors?.[0]?.msg ||
  'Server Error';

export default getApiError;