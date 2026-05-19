/**
 * Lightweight in-memory cache for Express API responses.
 *
 * The TTL (24 h) is a safety-net fallback only. Actual freshness is maintained
 * by explicit invalidation triggered whenever a write operation succeeds.
 * That means a new product / brand / category update is immediately visible
 * without waiting for the clock to expire.
 */
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** @type {Map<string, { data: unknown; expiresAt: number }>} */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttl = TTL_MS) {
  store.set(key, { data, expiresAt: Date.now() + ttl });
}

/**
 * Delete every cached key whose path contains at least one of the given patterns.
 * e.g. invalidate('/products') removes '/products', '/products?featured=true', etc.
 */
function invalidate(...patterns) {
  for (const key of store.keys()) {
    if (patterns.some((p) => key.includes(p))) {
      store.delete(key);
    }
  }
}

function clear() {
  store.clear();
}

/** Diagnostics — number of live entries */
function size() {
  return store.size;
}

module.exports = { get, set, invalidate, clear, size };
