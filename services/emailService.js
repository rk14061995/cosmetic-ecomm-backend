const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Cosmetic Web" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
};

exports.sendPasswordResetEmail = async (email, resetUrl) => {
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#e91e8c">Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#e91e8c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;margin:16px 0">
          Reset Password
        </a>
        <p>This link expires in 10 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

exports.sendOrderConfirmationEmail = async (email, order) => {
  const itemsList = order.orderItems
    .map((item) => `<li>${item.name} x${item.quantity} - ₹${item.price * item.quantity}</li>`)
    .join('');

  await sendEmail({
    to: email,
    subject: `Order Confirmed - #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#e91e8c">Order Confirmed!</h2>
        <p>Thank you for your order. Here's a summary:</p>
        <p><strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
        <ul>${itemsList}</ul>
        <p><strong>Total: ₹${order.totalPrice}</strong></p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
        <p>We'll notify you once your order ships!</p>
      </div>
    `,
  });
};

exports.sendAbandonedCartEmail = async (email, userName, cartItems) => {
  const itemsList = cartItems
    .map((i) => `<li>${i.name || 'Item'} × ${i.quantity}</li>`)
    .join('');
  await sendEmail({
    to: email,
    subject: '🛒 You left something behind at GlowBox!',
    html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
      <h2 style="color:#ec4899">Hey ${userName}, your cart misses you! 💕</h2>
      <p>You left these beauties behind:</p>
      <ul style="line-height:2">${itemsList}</ul>
      <a href="${process.env.FRONTEND_URL}/cart" style="display:inline-block;background:#ec4899;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:12px">
        Complete My Purchase →
      </a>
      <p style="color:#888;font-size:12px;margin-top:20px">Stock is limited — don't miss out!</p>
    </div>`,
  });
};

exports.sendOrderStatusEmail = async (email, order, status) => {
  await sendEmail({
    to: email,
    subject: `Order Update - #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#e91e8c">Order Status Update</h2>
        <p>Your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> status has been updated to:</p>
        <h3 style="color:#333">${status}</h3>
        ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
      </div>
    `,
  });
};
