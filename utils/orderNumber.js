const crypto = require('crypto');

function orderPrefix() {
  const raw = (process.env.ORDER_NUMBER_PREFIX || 'KX').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return raw.slice(0, 8) || 'KX';
}

function randomSegment() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function formatCandidate() {
  const year = new Date().getFullYear();
  return `${orderPrefix()}-${year}-${randomSegment()}`;
}

/**
 * @param {import('mongoose').Model} OrderModel
 * @param {number} attempts
 */
async function allocateUniqueOrderNumber(OrderModel, attempts = 16) {
  for (let i = 0; i < attempts; i += 1) {
    const candidate = formatCandidate();
    // eslint-disable-next-line no-await-in-loop
    const exists = await OrderModel.exists({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Could not allocate unique order number');
}

module.exports = { allocateUniqueOrderNumber, formatCandidate, orderPrefix };
