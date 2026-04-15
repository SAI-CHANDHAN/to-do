const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const passport = require('passport');
const {
  generateAccessToken,
  generateRefreshToken,
  getTokenJti,
  refreshTokenSecret
} = require('../utils/tokens');
const { clearAuthCookies, setAuthCookies } = require('../utils/cookies');
const {
  setRefreshTokenRecord,
  getRefreshTokenRecord,
  revokeRefreshToken,
  revokeUserRefreshTokens
} = require('../config/redis');

const refreshTokenTtlSeconds = 7 * 24 * 60 * 60;

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

const buildAuthResponse = user => ({
  success: true,
  data: {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null
    }
  },
  message: 'Authentication successful',
  errors: null
});

const persistSession = async (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const refreshJti = getTokenJti(refreshToken);

  await setRefreshTokenRecord({
    userId: user._id.toString(),
    jti: refreshJti,
    tokenHash: hashToken(refreshToken),
    expiresInSeconds: refreshTokenTtlSeconds
  });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken });
  const cookieHeader = res.getHeader('Set-Cookie');
  console.info(
    '[auth] session persisted',
    JSON.stringify({
      userId: user._id.toString(),
      cookieCount: Array.isArray(cookieHeader) ? cookieHeader.length : cookieHeader ? 1 : 0
    })
  );

  return buildAuthResponse(user);
};

const sanitizeUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null
});

// Register user
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'User already exists',
        errors: null
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      password
    });

    await user.save();

    const response = await persistSession(res, user);

    res.status(201).json({
      ...response,
      message: 'Registration successful'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid credentials',
        errors: null
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid credentials',
        errors: null
      });
    }

    const response = await persistSession(res, user);
    console.info('[auth] login success', JSON.stringify({ email: user.email, userId: user._id.toString() }));

    res.json({
      ...response,
      message: 'Login successful'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

// Get user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
        errors: null
      });
    }

    res.json({
      success: true,
      data: sanitizeUser(user),
      message: 'User fetched successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    console.info('[auth] refresh requested', JSON.stringify({ hasRefreshCookie: Boolean(token) }));

    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Refresh token missing',
        errors: null
      });
    }

    const decoded = jwt.verify(token, refreshTokenSecret);
    const jti = decoded.jti;
    const storedRecord = await getRefreshTokenRecord(jti);

    if (!storedRecord || storedRecord.tokenHash !== hashToken(token)) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Refresh token is not valid',
        errors: null
      });
    }

    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
        errors: null
      });
    }

    await revokeRefreshToken(jti);

    const response = await persistSession(res, user);
    console.info('[auth] refresh success', JSON.stringify({ userId: user._id.toString() }));
    res.json({
      ...response,
      message: 'Token refreshed successfully'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Refresh token is not valid',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.jti) {
        await revokeRefreshToken(decoded.jti);
      }
      if (decoded?.user?.id) {
        await revokeUserRefreshTokens(decoded.user.id);
      }
    }

    clearAuthCookies(res);
    res.json({
      success: true,
      data: null,
      message: 'Logged out successfully',
      errors: null
    });
  } catch (err) {
    clearAuthCookies(res);
    res.json({
      success: true,
      data: null,
      message: 'Logged out successfully',
      errors: null
    });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const response = await persistSession(res, req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectPath = new URL('/dashboard', frontendUrl).toString();

    if (req.accepts('json') && req.query.state === 'json') {
      return res.json({
        ...response,
        message: 'Google login successful'
      });
    }

    return res.redirect(redirectPath);
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Google authentication failed',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};