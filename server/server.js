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
const CLIENT_URL = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const corsOptions = {
  origin: CLIENT_URL,
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
  connectDB();
  connectRedis().catch(error => {
    console.error('Redis connection failed:', error.message);
  });
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;