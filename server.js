require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

validateEnv();
connectDB();

const app = express();

app.use(helmet());
const normalizeOrigin = (value) => {
  if (!value) return '';
  try {
    const parsed = new URL(String(value).trim());
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return String(value).trim().replace(/\/+$/, '');
  }
};

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean)
    : []),
]
  .map(normalizeOrigin)
  .filter(Boolean);

const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW === 'true';
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';
const allowHttpsOrigins = process.env.ALLOW_HTTPS_ORIGINS !== 'false';
app.use(cors({
  origin: (origin, cb) => {
    const normalizedOrigin = normalizeOrigin(origin);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);
    const isVercel = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalizedOrigin);
    const isHttpsOrigin = /^https:\/\/.+/.test(normalizedOrigin);
    if (
      allowAllOrigins ||
      !origin ||
      isLocalhost ||
      (allowHttpsOrigins && isHttpsOrigin) ||
      allowedOrigins.includes(normalizedOrigin) ||
      isVercel ||
      (allowVercelPreview && isVercel)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/mystery-boxes', require('./routes/mysteryBoxes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/gift-cards', require('./routes/giftCards'));
app.use('/api/back-in-stock', require('./routes/backInStock'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/affiliates', require('./routes/affiliates'));
app.use('/api/bundles', require('./routes/bundles'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));

module.exports = app;
