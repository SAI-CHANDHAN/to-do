const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const accessTokenSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const signToken = (payload, secret, expiresIn) =>
  jwt.sign(payload, secret, {
    expiresIn,
    jwtid: crypto.randomUUID()
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

const getTokenJti = token => jwt.decode(token)?.jti;

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  getTokenJti,
  accessTokenSecret,
  refreshTokenSecret
};