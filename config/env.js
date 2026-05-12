const requiredInProd = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

// MSG91 is optional: phone OTP routes fail at runtime with a clear error if SMS is used without keys.

function validateEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = requiredInProd.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { validateEnv };
