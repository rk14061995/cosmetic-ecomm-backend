/**
 * Quick test — sends a realistic invoice email to yourself.
 * Usage:  node scripts/testInvoiceEmail.js [recipient@email.com]
 */
require('dotenv').config();
const { sendInvoiceEmail } = require('../services/emailService');

const recipient = process.argv[2] || process.env.EMAIL_USER;

// ── Mock order object ───────────────────────────────────────────────────────
const mockOrder = {
  _id: '664f1a2b3c4d5e6f7a8b9c0d',
  orderNumber: 'KX-2025-001',
  createdAt: new Date(),
  paidAt: new Date(),
  orderStatus: 'Paid',
  paymentMethod: 'razorpay',

  orderItems: [
    { name: 'Rose Glow Face Serum 30ml',  quantity: 2, price: 799  },
    { name: 'Matte Lipstick — Berry Red', quantity: 1, price: 349  },
    { name: 'Hyaluronic Moisturiser',     quantity: 1, price: 1299 },
  ],

  itemsPrice:     3246,
  shippingPrice:  0,        // FREE shipping
  discountAmount: 200,      // coupon
  walletAmountUsed: 100,
  pointsRedeemed: 50,
  pointsRedeemedValue: 50,
  totalPrice:     2896,

  couponCode: 'BEAUTY20',

  shippingAddress: {
    fullName:    'Priya Sharma',
    addressLine1:'12, Rose Garden Apartments',
    addressLine2:'Sector 14',
    city:        'Gurugram',
    state:       'Haryana',
    pincode:     '122001',
    phone:       '9876543210',
  },

  paymentResult: {
    razorpayPaymentId: 'pay_TestABCDEF123456',
  },
};

// ── Mock payment details ────────────────────────────────────────────────────
const mockPayment = {
  method:    'upi',
  paymentId: 'pay_TestABCDEF123456',
  paidAt:    new Date(),
};

// ── Send ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n📧  Sending test invoice to: ${recipient}\n`);
  await sendInvoiceEmail(recipient, mockOrder, 'Priya Sharma', mockPayment);
  console.log('\n✅  Done — check your inbox (and spam folder just in case).\n');
})();
