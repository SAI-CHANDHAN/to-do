const { createClient } = require('redis');

let client;
let redisUnavailableLogged = false;

const isRedisReady = redisClient => Boolean(redisClient && redisClient.isOpen && redisClient.isReady);

const logRedisUnavailable = message => {
  if (redisUnavailableLogged) {
    return;
  }

  redisUnavailableLogged = true;
  console.warn(`Redis unavailable, continuing without cache/session store: ${message}`);
};

const getRedisClient = () => {
  if (client) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: retries => {
        // Stop retrying after a few attempts to avoid noisy logs in local dev.
        if (retries >= 5) {
          return false;
        }

        return Math.min((retries + 1) * 200, 2000);
      }
    }
  });

  client.on('error', error => {
    logRedisUnavailable(error.message);
  });

  return client;
};

const connectRedis = async () => {
  const redisClient = getRedisClient();
  if (!redisClient || isRedisReady(redisClient)) {
    return redisClient;
  }

  try {
    await redisClient.connect();
    redisUnavailableLogged = false;
    console.log('Redis connected');
    return redisClient;
  } catch (error) {
    logRedisUnavailable(error.message);
    return null;
  }
};

const cacheTasksKey = userId => `cache:tasks:${userId}`;
const refreshTokenKey = jti => `auth:refresh:${jti}`;
const refreshTokenUserKey = userId => `auth:refresh:user:${userId}`;
const mfaChallengeKey = challengeId => `auth:mfa:challenge:${challengeId}`;

const setRefreshTokenRecord = async ({ userId, jti, tokenHash, expiresInSeconds }) => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.set(refreshTokenKey(jti), JSON.stringify({ userId, tokenHash }), {
    EX: expiresInSeconds
  });
  await redisClient.sAdd(refreshTokenUserKey(userId), jti);
  await redisClient.expire(refreshTokenUserKey(userId), expiresInSeconds);
};

const getRefreshTokenRecord = async jti => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return null;
  }

  const record = await redisClient.get(refreshTokenKey(jti));
  return record ? JSON.parse(record) : null;
};

const revokeRefreshToken = async jti => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.del(refreshTokenKey(jti));
};

const revokeUserRefreshTokens = async userId => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  const jtis = await redisClient.sMembers(refreshTokenUserKey(userId));
  if (jtis.length > 0) {
    await redisClient.del(...jtis.map(jti => refreshTokenKey(jti)));
  }
  await redisClient.del(refreshTokenUserKey(userId));
};

const getCachedTasks = async userId => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return null;
  }

  const cache = await redisClient.get(cacheTasksKey(userId));
  return cache ? JSON.parse(cache) : null;
};

const setCachedTasks = async (userId, payload, ttlSeconds = 60) => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.set(cacheTasksKey(userId), JSON.stringify(payload), {
    EX: ttlSeconds
  });
};

const clearTaskCache = async userId => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.del(cacheTasksKey(userId));
};

const setMfaChallenge = async ({ challengeId, userId, expiresInSeconds = 300 }) => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.set(mfaChallengeKey(challengeId), userId, {
    EX: expiresInSeconds
  });
};

const getMfaChallenge = async challengeId => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return null;
  }

  return redisClient.get(mfaChallengeKey(challengeId));
};

const revokeMfaChallenge = async challengeId => {
  const redisClient = getRedisClient();
  if (!isRedisReady(redisClient)) {
    return;
  }

  await redisClient.del(mfaChallengeKey(challengeId));
};

module.exports = {
  connectRedis,
  getRedisClient,
  getCachedTasks,
  setCachedTasks,
  clearTaskCache,
  setRefreshTokenRecord,
  getRefreshTokenRecord,
  revokeRefreshToken,
  revokeUserRefreshTokens,
  setMfaChallenge,
  getMfaChallenge,
  revokeMfaChallenge,
  refreshTokenKey,
  cacheTasksKey
};