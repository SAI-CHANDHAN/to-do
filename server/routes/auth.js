const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const csrfProtection = require('../middleware/csrf');
const { userValidation, loginValidation } = require('../middleware/sanitize');
const passport = require('passport');

const googleOAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts. Please try again later.',
    errors: null
  }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many token refresh requests. Please try again later.',
    errors: null
  }
});

const oauthInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: 'Too many OAuth attempts. Please try again later.',
    errors: null
  }
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  credentialLimiter,
  userValidation,
  authController.registerUser
);

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  credentialLimiter,
  loginValidation,
  authController.loginUser
);

// @route   POST api/auth/refresh
// @desc    Refresh access token
// @access  Public with refresh cookie
router.post('/refresh', refreshLimiter, csrfProtection, authController.refreshToken);

// @route   POST api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', csrfProtection, auth, authController.logout);

// @route   GET api/auth/google
// @desc    Google OAuth login
// @access  Public
router.get('/google', oauthInitLimiter, (req, res, next) => {
  if (!googleOAuthConfigured) {
    return res.status(503).json({
      success: false,
      data: null,
      message: 'Google OAuth is not configured',
      errors: null
    });
  }

  return passport.authenticate('google', { scope: ['openid', 'profile', 'email'], session: false })(req, res, next);
});

// @route   GET api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!googleOAuthConfigured) {
      return res.status(503).json({
        success: false,
        data: null,
        message: 'Google OAuth is not configured',
        errors: null
      });
    }

    return passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
    })(req, res, next);
  },
  authController.googleCallback
);

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
router.get('/', auth, authController.getUser);

module.exports = router;