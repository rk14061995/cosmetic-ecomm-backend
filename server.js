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
const isProduction = process.env.NODE_ENV === 'production';

/** Private LAN / machine hostnames (common when testing from another device on the same network). */
function isPrivateNetworkOrigin(o) {
  if (!o) return false;
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o) ||
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(o) ||
    /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(o) ||
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(o) ||
    /^https?:\/\/[^/]+\.local(:\d+)?$/i.test(o)
  );
}

/** Vercel production + preview hosts (multi-label subdomains). */
function isVercelHost(o) {
  if (!o) return false;
  return /^https:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.vercel\.app$/i.test(o);
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (allowAllOrigins) {
        return cb(null, true);
      }
      // Same-origin / curl / some mobile WebViews send no Origin
      if (!origin) {
        return cb(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);
      const isVercel = isVercelHost(normalizedOrigin);
      const isHttpsOrigin = /^https:\/\/.+/i.test(normalizedOrigin);
      const onLan = isPrivateNetworkOrigin(normalizedOrigin);

      if (
        isLocalhost ||
        onLan ||
        (allowHttpsOrigins && isHttpsOrigin) ||
        allowedOrigins.includes(normalizedOrigin) ||
        isVercel ||
        (allowVercelPreview && isVercel)
      ) {
        return cb(null, true);
      }

      // Non-production: avoid locking out local setups (unknown host, tunnel, etc.)
      if (!isProduction) {
        return cb(null, true);
      }

      // Production: deny without throwing — throwing can confuse browsers' CORS diagnostics
      console.warn(`[CORS] Blocked origin: ${origin}. Set FRONTEND_URL or ALLOWED_ORIGINS (or ALLOW_HTTPS_ORIGINS=true).`);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  })
);
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
/** Same router without `/api` prefix — avoids 404 when clients use base URL `http://host:5000` + `/orders/...`. */
app.use('/orders', require('./routes/orders'));
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
app.use('/api/marketing-links', require('./routes/marketingLinks'));
/** Same path without `/api` — matches nginx `proxy_pass .../` that strips the `/api` prefix (see `/orders` below). */
app.use('/marketing-links', require('./routes/marketingLinks'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/refunds', require('./routes/refunds'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));

module.exports = app;
