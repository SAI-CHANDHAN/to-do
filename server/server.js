require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 5000;
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const configurePassport = require('./config/passport');
const { connectRedis } = require('./config/redis');

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

const allowedOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .flatMap(value => value.split(','))
  .map(origin => normalizeOrigin(origin))
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests with no Origin header.
    if (!origin) {
      return callback(null, true);
    }

    // Fail-safe for hosted platforms: if no allowlist configured, reflect request origin.
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    const requestOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }

    console.warn('[cors] blocked origin', requestOrigin, 'allowed:', allowedOrigins);
    return callback(new Error(`Not allowed by CORS: ${requestOrigin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-auth-token']
};

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use('/api', apiLimiter);
configurePassport();
app.use(passport.initialize());

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/payment', require('./routes/paymentRoutes'));

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: null,
    message: 'API is running',
    errors: null
  });
});

app.get('/api/healthz', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok'
    },
    message: 'Service healthy',
    errors: null
  });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  console.info('Allowed CORS origins:', allowedOrigins.length > 0 ? allowedOrigins : 'ANY (no allowlist set)');
  connectDB();
  connectRedis().catch(error => {
    console.error('Redis connection failed:', error.message);
  });
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;