const jwt = require('jsonwebtoken');
const { accessTokenSecret } = require('../utils/tokens');

module.exports = function(req, res, next) {
  const bearerToken = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const cookieToken = req.cookies?.accessToken;
  const headerToken = req.header('x-auth-token');
  const token = cookieToken || bearerToken || headerToken;

  console.info(
    '[auth-middleware] token check',
    JSON.stringify({
      path: req.originalUrl,
      hasCookieToken: Boolean(cookieToken),
      hasBearerToken: Boolean(bearerToken),
      hasLegacyHeaderToken: Boolean(headerToken)
    })
  );

  // Check if no token
  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'No token, authorization denied',
      errors: null
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.warn('[auth-middleware] token verification failed', err.message);
    res.status(401).json({
      success: false,
      data: null,
      message: 'Token is not valid',
      errors: null
    });
  }
};