const nodemailer = require('nodemailer');

/* ─── Transporter ────────────────────────────────────────────────────────────
   Gmail SMTP setup for kosmeticxglow@gmail.com:
     1. Enable 2-Step Verification on the account
     2. Google Account → Security → App passwords
     3. Generate one for "Mail / Other (KosmeticX Server)"
     4. Paste the 16-char App Password into EMAIL_PASS in .env
─────────────────────────────────────────────────────────────────────────────*/
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const SITE_NAME   = process.env.SITE_NAME    || 'KosmeticX';
const SITE_URL    = process.env.FRONTEND_URL  || 'http://localhost:3000';
const FROM_EMAIL  = process.env.EMAIL_FROM   || process.env.EMAIL_USER || 'noreply@kosmeticx.com';
const BRAND_COLOR = '#4f46e5';

function fmt(n) { return `₹${Number(n || 0).toFixed(2)}`; }

function publicOrderLabel(order) {
  if (order.orderNumber) return `#${order.orderNumber}`;
  return `#${order._id.toString().slice(-8).toUpperCase()}`;
}

/* ─── Base email layout ──────────────────────────────────────────────────── */
function wrapLayout(bodyHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f3f4f6;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,#7c3aed 100%);padding:28px 32px;text-align:center;">
            <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">${SITE_NAME}</span>
            <p style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase;">Beauty &amp; Cosmetics</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px 32px 24px;">${bodyHtml}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin-bottom:4px;">&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
            <p style="font-size:12px;color:#9ca3af;">Questions? Reply to this email or contact <a href="mailto:${FROM_EMAIL}" style="color:${BRAND_COLOR};">${FROM_EMAIL}</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Invoice HTML builder ───────────────────────────────────────────────── */
function buildInvoiceHtml(order, userName) {
  const label     = publicOrderLabel(order);
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const addr      = order.shippingAddress || {};

  const itemRows = (order.orderItems || []).map((item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.name}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;">${fmt(item.price)}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#111827;text-align:right;">${fmt(item.price * item.quantity)}</td>
    </tr>`).join('');

  const body = `
    <!-- Success badge -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:56px;height:56px;background:#dcfce7;border-radius:50%;line-height:56px;font-size:28px;margin-bottom:12px;">✅</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:6px;">Order Confirmed!</h1>
      <p style="font-size:14px;color:#6b7280;">Hi <strong>${userName || 'there'}</strong>, thank you for your purchase 💕</p>
    </div>

    <!-- Order meta chips -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Order</p>
          <p style="font-size:14px;font-weight:700;color:#111827;">${label}</p>
        </td>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Date</p>
          <p style="font-size:14px;font-weight:700;color:#111827;">${orderDate}</p>
        </td>
        <td style="padding:14px 16px;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Payment</p>
          <p style="font-size:14px;font-weight:700;color:#16a34a;">Paid ✓</p>
        </td>
      </tr>
    </table>

    <!-- Items table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;text-align:left;">Product</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;text-align:center;">Qty</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;text-align:right;">Price</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Price breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td>
        <td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;">${fmt(order.itemsPrice)}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">Shipping</td>
        <td style="padding:5px 0;font-size:13px;text-align:right;${order.shippingPrice === 0 ? 'color:#16a34a;font-weight:600;' : 'color:#374151;'}">${order.shippingPrice === 0 ? 'FREE 🎉' : fmt(order.shippingPrice)}</td>
      </tr>
      ${order.discountAmount > 0 ? `
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#16a34a;">Discount</td>
        <td style="padding:5px 0;font-size:13px;color:#16a34a;text-align:right;">− ${fmt(order.discountAmount)}</td>
      </tr>` : ''}
      <tr><td colspan="2" style="padding:10px 0 0;"><hr style="border:none;border-top:2px solid #e5e7eb;margin:0;"/></td></tr>
      <tr>
        <td style="padding:10px 0 0;font-size:17px;font-weight:800;color:#111827;">Grand Total</td>
        <td style="padding:10px 0 0;font-size:17px;font-weight:800;color:${BRAND_COLOR};text-align:right;">${fmt(order.totalPrice)}</td>
      </tr>
    </table>

    <!-- Delivery address -->
    ${addr.addressLine1 ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📍 Deliver to</p>
      <p style="font-size:14px;font-weight:600;color:#111827;margin-bottom:2px;">${addr.fullName || ''}</p>
      <p style="font-size:13px;color:#6b7280;">${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}</p>
      <p style="font-size:13px;color:#6b7280;">${addr.city || ''}, ${addr.state || ''} — ${addr.pincode || ''}</p>
      ${addr.phone ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">📞 ${addr.phone}</p>` : ''}
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="${SITE_URL}/profile/orders" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.02em;">
        View My Order →
      </a>
      <p style="font-size:12px;color:#9ca3af;margin-top:14px;">We'll email you again when your order ships 🚀</p>
    </div>`;

  return wrapLayout(body, `Your ${SITE_NAME} order ${label} is confirmed — thank you!`);
}

/* ─── Core send ──────────────────────────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER / EMAIL_PASS not configured — skipping send to', to);
    return;
  }
  try {
    if (process.env.SES_LAMBDA_URL) {
      const headers = { 'content-type': 'application/json' };
      if (process.env.SES_LAMBDA_API_KEY) headers['x-api-key'] = process.env.SES_LAMBDA_API_KEY;
      const res = await fetch(process.env.SES_LAMBDA_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ to, subject, html, from: FROM_EMAIL }),
      });
      if (!res.ok) throw new Error(`SES Lambda ${res.status}: ${await res.text()}`);
    } else {
      await getTransporter().sendMail({
        from: `"${SITE_NAME}" <${FROM_EMAIL}>`,
        to, subject, html,
      });
    }
    console.log(`[email] ✅ Sent "${subject}" → ${to}`);
  } catch (err) {
    // Never crash the API call because of a failed email
    console.error(`[email] ❌ Failed to send "${subject}" → ${to}:`, err?.message || err);
  }
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

/** Branded invoice email sent immediately after payment is confirmed. */
exports.sendInvoiceEmail = async (email, order, userName) => {
  const label = publicOrderLabel(order);
  await sendEmail({
    to: email,
    subject: `🛍️ Your ${SITE_NAME} Invoice — ${label}`,
    html: buildInvoiceHtml(order, userName),
  });
};

/** Alias kept for backward-compat with orderController.js */
exports.sendOrderConfirmationEmail = exports.sendInvoiceEmail;

/** Password reset link. */
exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:44px;margin-bottom:12px;">🔐</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:8px;">Reset Your Password</h1>
      <p style="font-size:14px;color:#6b7280;">Click the button below to set a new password. This link expires in <strong>10 minutes</strong>.</p>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:50px;text-decoration:none;">
        Reset My Password →
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;">Didn't request this? Just ignore this email — your account is safe.</p>`;

  await sendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    html: wrapLayout(body),
  });
};

/** Order status update (Shipped / Out for Delivery / Delivered). */
exports.sendOrderStatusEmail = async (email, order, status, userName) => {
  const label   = publicOrderLabel(order);
  const emoji   = { Shipped: '📦', 'Out for Delivery': '🚚', Delivered: '🎉' }[status] || '📋';

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:44px;margin-bottom:12px;">${emoji}</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:8px;">Order ${status}</h1>
      <p style="font-size:14px;color:#6b7280;">Hi <strong>${userName || 'there'}</strong>, your order <strong>${label}</strong> has been updated.</p>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-size:16px;font-weight:700;color:${BRAND_COLOR};margin-bottom:${order.trackingNumber ? '8px' : '0'};">${status}</p>
      ${order.trackingNumber ? `<p style="font-size:13px;color:#6b7280;">Tracking #: <strong>${order.trackingNumber}</strong></p>` : ''}
    </div>
    <div style="text-align:center;">
      <a href="${SITE_URL}/profile/orders" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:50px;text-decoration:none;">
        Track My Order →
      </a>
    </div>`;

  await sendEmail({
    to: email,
    subject: `${emoji} ${SITE_NAME} order ${label} — ${status}`,
    html: wrapLayout(body),
  });
};

/** Abandoned cart nudge. */
exports.sendAbandonedCartEmail = async (email, userName, cartItems) => {
  const rows = cartItems.map((i) =>
    `<li style="padding:5px 0;font-size:14px;color:#374151;">${i.name || 'Item'} <span style="color:#6b7280;">× ${i.quantity}</span></li>`
  ).join('');

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:44px;margin-bottom:12px;">🛒</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:8px;">You left something behind!</h1>
      <p style="font-size:14px;color:#6b7280;">Hey <strong>${userName}</strong>, your beauty picks are still waiting for you.</p>
    </div>
    <ul style="list-style:none;padding:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;">${rows}</ul>
    <div style="text-align:center;">
      <a href="${SITE_URL}/cart" style="display:inline-block;background:linear-gradient(135deg,${BRAND_COLOR},#7c3aed);color:#fff;font-weight:700;font-size:14px;padding:14px 40px;border-radius:50px;text-decoration:none;">
        Complete My Purchase →
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:14px;">Stock is limited — don't miss out! 💕</p>`;

  await sendEmail({
    to: email,
    subject: `🛒 ${userName}, your ${SITE_NAME} cart misses you!`,
    html: wrapLayout(body),
  });
};
