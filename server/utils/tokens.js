const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const accessTokenSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const signToken = (payload, secret, expiresIn, tokenId = crypto.randomUUID()) =>
  jwt.sign({ ...payload, tokenId }, secret, {
    expiresIn,
    jwtid: tokenId
  });

const createUserPayload = user => ({
  user: {
    id: user._id.toString(),
    email: user.email,
    name: user.name
  }
});

const generateAccessToken = user => signToken(createUserPayload(user), accessTokenSecret, '15m');
const generateRefreshToken = user => signToken(createUserPayload(user), refreshTokenSecret, '7d');

const generateMfaChallengeToken = user => {
  const challengeId = crypto.randomUUID();

  const token = signToken(
    {
      purpose: 'mfa-login',
      user: {
        id: user._id.toString()
      },
      challengeId
    },
    accessTokenSecret,
    '5m',
    challengeId
  );

  return {
    token,
    challengeId
  };
};

const verifyMfaChallengeToken = token => {
  const decoded = jwt.verify(token, accessTokenSecret);
  if (decoded.purpose !== 'mfa-login' || !decoded.challengeId) {
    throw new Error('Invalid MFA challenge token');
  }

  return decoded;
};

const getTokenJti = token => jwt.decode(token)?.jti;

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateMfaChallengeToken,
  verifyMfaChallengeToken,
  getTokenJti,
  accessTokenSecret,
  refreshTokenSecret
};