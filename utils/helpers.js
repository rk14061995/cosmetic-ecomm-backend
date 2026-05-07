const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
  return { accessToken, refreshToken };
};

exports.slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

exports.generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiry = Date.now() + 10 * 60 * 1000;
  return { resetToken, hashedToken, expiry };
};

exports.calculateShipping = (orderAmount) => {
  if (orderAmount >= 500) return 0;
  return 50;
};

exports.getPaginationData = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / pageSize);
  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: total,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};
