const getApiError = err =>
  err.response?.data?.errors?.[0]?.msg ||
  err.response?.data?.errors?.[0]?.message ||
  err.response?.data?.message ||
  err.response?.data?.msg ||
  'Server Error';

export default getApiError;