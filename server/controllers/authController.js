const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const {
  generateAccessToken,
  generateRefreshToken,
  generateMfaChallengeToken,
  verifyMfaChallengeToken,
  getTokenJti,
  refreshTokenSecret
} = require('../utils/tokens');
const { encrypt, decrypt } = require('../utils/encryption');
const { clearAuthCookies, setAuthCookies } = require('../utils/cookies');
const {
  setRefreshTokenRecord,
  getRefreshTokenRecord,
  revokeRefreshToken,
  revokeUserRefreshTokens,
  setMfaChallenge,
  getMfaChallenge,
  revokeMfaChallenge
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
      avatar: user.avatar || null,
      mfaEnabled: Boolean(user.mfaEnabled),
      isPremium: Boolean(user.isPremium)
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

  // Hybrid: always return accessToken in response for cross-domain JWT auth
  return {
    ...buildAuthResponse(user),
    accessToken
  };
};

const sanitizeUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  mfaEnabled: Boolean(user.mfaEnabled),
  isPremium: Boolean(user.isPremium)
});

const disableMfaForUser = async user => {
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaTempSecret = null;
  await user.save();
};

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
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    // If cross-domain (Vercel/Railway), redirect with token in URL
    const accessToken = response.accessToken;
    const isCrossDomain = frontendUrl.includes('vercel') || frontendUrl.includes('railway');
    if (isCrossDomain && accessToken) {
      return res.redirect(`${frontendUrl}/oauth-success?token=${accessToken}`);
    }

    // Default: AWS/cookie flow
    const redirectPath = new URL('/dashboard', frontendUrl).toString();
    if (req.accepts('json') && req.query.state === 'json') {
      return res.json({
        ...response,
        message: 'Google login successful'
      });
    }
    return res.redirect(redirectPath);
  } catch (error) {
    console.error('Auth Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
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

    if (user.mfaEnabled && user.mfaSecret) {
      const { token: mfaToken, challengeId } = generateMfaChallengeToken(user);
      await setMfaChallenge({
        challengeId,
        userId: user._id.toString(),
        expiresInSeconds: 600
      });

      return res.json({
        success: true,
        data: {
          mfaRequired: true,
          mfaToken
        },
        message: 'MFA verification required',
        errors: null
      });
    }

    const response = await persistSession(res, user);
    console.info('[auth] login success', JSON.stringify({ email: user.email, userId: user._id.toString() }));

    res.json({
      ...response,
      accessToken: response.accessToken, // explicit for clarity
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

exports.setupMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
        errors: null
      });
    }

    const secret = speakeasy.generateSecret({
      name: `Tasque (${user.email})`,
      length: 32
    });

    user.mfaTempSecret = encrypt(secret.base32);
    await user.save();

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      success: true,
      data: {
        qrCodeDataUrl,
        manualKey: secret.base32
      },
      message: 'MFA setup initialized',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.verifyMfaSetup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.mfaTempSecret) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'MFA setup is not initialized',
        errors: null
      });
    }

    const otp = String(req.body.otp).trim();
    const secret = decrypt(user.mfaTempSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: otp,
      window: 1
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid MFA code',
        errors: null
      });
    }

    user.mfaSecret = user.mfaTempSecret;
    user.mfaTempSecret = null;
    user.mfaEnabled = true;
    await user.save();

    return res.json({
      success: true,
      data: { mfaEnabled: true },
      message: 'MFA enabled successfully',
      errors: null
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server error',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.mfaLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { mfaToken, otp } = req.body;
    const decodedChallenge = verifyMfaChallengeToken(mfaToken);
    const challengeUserId = decodedChallenge.user?.id;
    const challengeId = decodedChallenge.challengeId;

    const storedChallengeUserId = await getMfaChallenge(challengeId);
    if (storedChallengeUserId && storedChallengeUserId !== challengeUserId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'MFA challenge is not valid',
        errors: null
      });
    }

    const user = await User.findById(challengeUserId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'MFA is not enabled for this account',
        errors: null
      });
    }

    const secret = decrypt(user.mfaSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: String(otp).trim(),
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid MFA code',
        errors: null
      });
    }

    await revokeMfaChallenge(challengeId);

    const response = await persistSession(res, user);
    return res.json({
      ...response,
      message: 'Login successful'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'MFA challenge has expired or is invalid',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.recoverMfaLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { mfaToken } = req.body;
    const decodedChallenge = verifyMfaChallengeToken(mfaToken);
    const challengeUserId = decodedChallenge.user?.id;
    const challengeId = decodedChallenge.challengeId;

    const storedChallengeUserId = await getMfaChallenge(challengeId);
    if (storedChallengeUserId && storedChallengeUserId !== challengeUserId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'MFA challenge is not valid',
        errors: null
      });
    }

    const user = await User.findById(challengeUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
        errors: null
      });
    }

    await disableMfaForUser(user);
    await revokeMfaChallenge(challengeId);

    const response = await persistSession(res, user);
    return res.json({
      ...response,
      message: 'MFA has been reset. Set it up again from your dashboard.'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'MFA challenge has expired or is invalid',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};

exports.disableMfa = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found',
        errors: null
      });
    }

    if (!user.mfaEnabled && !user.mfaSecret && !user.mfaTempSecret) {
      return res.json({
        success: true,
        data: { mfaEnabled: false },
        message: 'MFA is already disabled',
        errors: null
      });
    }

    await disableMfaForUser(user);

    return res.json({
      success: true,
      data: { mfaEnabled: false },
      message: 'MFA disabled successfully',
      errors: null
    });
  } catch (err) {
    return res.status(500).json({
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
    const user = req.user;
    const response = await persistSession(res, user);
    const token = generateAccessToken(user);
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    if (req.accepts('json') && req.query.state === 'json') {
      return res.json({
        ...response,
        accessToken: token,
        message: 'Google login successful'
      });
    }

    return res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Google authentication failed',
      errors: process.env.NODE_ENV === 'production' ? null : [err.message]
    });
  }
};