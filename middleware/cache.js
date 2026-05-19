const cacheService = require('../services/cacheService');

/**
 * withCache(options?)
 *
 * Middleware that serves GET responses from the in-memory cache and writes
 * successful responses back into it.
 *
 * Authenticated requests are skipped by default because admins may see
 * additional data (inactive products, test products, etc.) that must not
 * bleed into the public cache.
 *
 * @param {{ skipAuth?: boolean }} [options]
 */
function withCache({ skipAuth = true } = {}) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (skipAuth && req.user) return next();

    const key = req.originalUrl;
    const cached = cacheService.get(key);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json so we can store the response before it is sent
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        cacheService.set(key, body);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * invalidateCache(...patterns)
 *
 * Middleware for write routes (POST / PUT / DELETE).
 * After a successful response (2xx), drops every cached key whose URL
 * contains any of the given patterns.
 *
 * Usage:
 *   router.post('/', protect, adminOnly, invalidateCache('/products'), createProduct);
 */
function invalidateCache(...patterns) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.invalidate(...patterns);
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { withCache, invalidateCache };
