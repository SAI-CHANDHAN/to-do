module.exports = function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.cookies?.csrfToken;
  const headerToken = req.header('x-csrf-token');

  if (!csrfToken || !headerToken || csrfToken !== headerToken) {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'CSRF token validation failed',
      errors: null
    });
  }

  return next();
};