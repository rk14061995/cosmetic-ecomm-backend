const mongoose = require('mongoose');

/**
 * Build a find filter for a route/API param that may be either a Mongo _id or a public orderNumber.
 * @param {string} paramId
 * @returns {Record<string, unknown>|null}
 */
function buildOrderIdFilter(paramId) {
  const raw = String(paramId || '').trim();
  if (!raw) return null;
  if (mongoose.isValidObjectId(raw)) {
    return { _id: raw };
  }
  return { orderNumber: raw };
}

module.exports = { buildOrderIdFilter };
