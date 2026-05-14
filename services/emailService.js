const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

function publicOrderLabel(order) {
  if (order.orderNumber) return order.orderNumber;
  return `#${order._id.toString().slice(-8).toUpperCase()}`;
}

function buildInvoiceHtml(order) {
  const orderId = publicOrderLabel(order);
  const rows = (order.orderItems || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price * item.quantity}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:20px;color:#111827">
      <h2 style="margin:0 0 8px">kosmeticX Invoice</h2>
      <p style="margin:0 0 16px;color:#6b7280">Order ${orderId}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="text-align:left;background:#f9fafb">
            <th style="padding:8px;border-bottom:1px solid #e5e7eb">Item</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">Qty</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">Price</th>
            <th style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right">
        <p style="margin:4px 0;color:#6b7280">Subtotal: ₹${order.itemsPrice || 0}</p>
        <p style="margin:4px 0;color:#6b7280">Shipping: ₹${order.shippingPrice || 0}</p>
        <p style="margin:4px 0;color:#6b7280">Discount: ₹${order.discountAmount || 0}</p>
        <p style="margin:8px 0 0;font-size:16px;font-weight:700">Grand Total: ₹${order.totalPrice || 0}</p>
      </div>
    </div>
  `;
}

async function sendViaLambda(payload) {
  const lambdaUrl = process.env.SES_LAMBDA_URL;
  if (!lambdaUrl) return false;

  const headers = { 'content-type': 'application/json' };
  if (process.env.SES_LAMBDA_API_KEY) {
    headers['x-api-key'] = process.env.SES_LAMBDA_API_KEY;
  }

  const response = await fetch(lambdaUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SES Lambda failed: ${response.status} ${errText}`);
  }

  return true;
}

async function sendViaNodemailer({ to, subject, html }) {
  const mailOptions = {
    from: `"kosmeticX" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  };
  return getTransporter().sendMail(mailOptions);
}

const sendEmail = async ({ to, subject, html, template, data }) => {
  // Email delivery is intentionally disabled for now.
  // Re-enable by removing this early return.
  return { disabled: true, to, subject, template };

  /* eslint-disable no-unreachable */
  const payload = {
    to,
    subject,
    html,
    template,
    data,
    from: process.env.EMAIL_FROM,
  };
  if (process.env.SES_LAMBDA_URL) {
    await sendViaLambda(payload);
    return;
  }
  await sendViaNodemailer({ to, subject, html });
  /* eslint-enable no-unreachable */
};

exports.sendPasswordResetEmail = async (email, resetUrl) => {
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    template: 'password-reset',
    data: { resetUrl },
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
  const label = publicOrderLabel(order);
  const itemsList = order.orderItems
    .map((item) => `<li>${item.name} x${item.quantity} - ₹${item.price * item.quantity}</li>`)
    .join('');

  await sendEmail({
    to: email,
    subject: `Order Confirmed - ${label}`,
    template: 'order-confirmation',
    data: {
      orderId: order._id.toString(),
      shortOrderId: label,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      orderItems: order.orderItems,
      shippingAddress: order.shippingAddress,
      invoiceHtml: buildInvoiceHtml(order),
    },
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#e91e8c">Order Confirmed!</h2>
        <p>Thank you for your order. Here's a summary:</p>
        <p><strong>Order ID:</strong> ${label}</p>
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
    template: 'abandoned-cart',
    data: { userName, cartItems, cartUrl: `${process.env.FRONTEND_URL}/cart` },
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
  const label = publicOrderLabel(order);
  await sendEmail({
    to: email,
    subject: `Order Update - ${label}`,
    template: 'order-status',
    data: {
      orderId: order._id.toString(),
      shortOrderId: label,
      status,
      trackingNumber: order.trackingNumber || '',
    },
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#e91e8c">Order Status Update</h2>
        <p>Your order <strong>${label}</strong> status has been updated to:</p>
        <h3 style="color:#333">${status}</h3>
        ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
      </div>
    `,
  });
};
