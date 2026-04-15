const normalizeOrigin = value => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch (_error) {
    return value.trim();
  }
};

const trustedOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN, 'http://localhost:3000']
  .filter(Boolean)
  .flatMap(value => value.split(','))
  .map(origin => normalizeOrigin(origin))
  .filter(Boolean);

module.exports = function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.cookies?.csrfToken;
  const headerToken = req.header('x-csrf-token');
  const requestOrigin = normalizeOrigin(req.header('origin'));

  // Primary check: double-submit token.
  if (csrfToken && headerToken && csrfToken === headerToken) {
    return next();
  }

  // Cross-domain fallback: allow only configured frontend origins.
  if (requestOrigin && trustedOrigins.includes(requestOrigin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    data: null,
    message: 'CSRF token validation failed',
    errors: null
  });
};