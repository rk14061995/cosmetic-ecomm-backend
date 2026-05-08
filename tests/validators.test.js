const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createRazorpayOrderSchema,
  verifyPaymentSchema,
} = require('../utils/validators');

test('createRazorpayOrderSchema accepts valid payload', () => {
  const { error } = createRazorpayOrderSchema.validate({
    orderId: '507f191e810c19729de860ea',
  });
  assert.equal(error, undefined);
});

test('verifyPaymentSchema rejects missing signature', () => {
  const { error } = verifyPaymentSchema.validate({
    orderId: '507f191e810c19729de860ea',
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
  });
  assert.notEqual(error, undefined);
});
