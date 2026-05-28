const nodemailer = require('nodemailer');

/* ─── Transporter ─────────────────────────────────────────────────────────── */
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const SITE_NAME          = process.env.SITE_NAME          || 'KosmeticX';
const SITE_URL           = process.env.FRONTEND_URL        || 'http://localhost:3000';
const FROM_EMAIL         = process.env.EMAIL_FROM         || process.env.EMAIL_USER || 'noreply@kosmeticx.com';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'kosmeticxglow@gmail.com';
const PRIMARY            = '#4f46e5';   // indigo-600
const PRIMARY_DARK       = '#7c3aed';   // violet-600

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(n) { return `₹${Number(n || 0).toFixed(2)}`; }

/**
 * Email-safe CTA button.
 * Rules:
 *  • <a> with background-color (NOT linear-gradient — Gmail strips it)
 *  • bgcolor attribute on wrapping <td> for Outlook (ignores CSS background)
 *  • border-radius on <td> for rounded corners; Outlook shows square (fine)
 *  • Always include a plain-text fallback link below
 */
function emailButton(url, label) {
  return `
  <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
    <tr>
      <td align="center" bgcolor="${PRIMARY}"
          style="background-color:${PRIMARY};border-radius:50px;mso-padding-alt:0;">
        <a href="${url}"
           style="display:inline-block;background-color:${PRIMARY};color:#ffffff;
                  font-family:Arial,sans-serif;font-size:14px;font-weight:700;
                  padding:15px 44px;border-radius:50px;text-decoration:none;
                  letter-spacing:0.03em;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin:0 0 4px;">
    Or copy this link into your browser:
  </p>
  <p style="text-align:center;font-size:11px;word-break:break-all;margin:0;">
    <a href="${url}" style="color:${PRIMARY};text-decoration:underline;">${url}</a>
  </p>`;
}

function publicOrderLabel(order) {
  if (order.orderNumber) return `#${order.orderNumber}`;
  return `#${order._id.toString().slice(-8).toUpperCase()}`;
}

/** Map Razorpay's lowercase method key → readable label + emoji */
function fmtPaymentMethod(method) {
  const map = {
    upi:        '📱 UPI',
    card:       '💳 Card',
    netbanking: '🏦 Net Banking',
    wallet:     '👛 Wallet',
    emi:        '📅 EMI',
    emandate:   '📋 eMandate',
    cod:        '💵 Cash on Delivery',
  };
  return map[(method || '').toLowerCase()] || `💳 ${method || 'Online'}`;
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* ─── Email-safe Brand Logo ───────────────────────────────────────────────────
   Rules for email clients (Gmail, Outlook, Apple Mail):
   • NO linear-gradient on <td> — Gmail strips it entirely
   • NO box-shadow / rgba border — stripped by Gmail & Outlook
   • Use background-color (solid) — universally supported
   • border-radius works in Gmail & Apple Mail; Outlook shows square corners (fine)
──────────────────────────────────────────────────────────────────────────────*/
const LOGO_HTML = `
  <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
    <tr>
      <td width="60" height="60"
          style="width:60px;height:60px;
                 background-color:#6366f1;
                 border-radius:14px;
                 text-align:center;
                 vertical-align:middle;
                 font-family:Arial,sans-serif;
                 font-size:30px;
                 font-weight:900;
                 color:#ffffff;
                 line-height:60px;">
        K
      </td>
    </tr>
  </table>`;

/* ─── Base layout ─────────────────────────────────────────────────────────── */
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
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;
                    box-shadow:0 6px 32px rgba(79,70,229,0.10);">

        <!-- ── Header / Logo ── -->
        <tr>
          <td bgcolor="${PRIMARY}"
              style="background-color:${PRIMARY};
                     padding:32px 32px 28px;text-align:center;">
            ${LOGO_HTML}
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;
                        font-family:Arial,sans-serif;">
              ${SITE_NAME}
            </div>
            <div style="color:#c7d2fe;font-size:11px;margin-top:5px;
                        letter-spacing:0.14em;text-transform:uppercase;">
              Beauty &amp; Cosmetics
            </div>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr><td style="padding:32px 32px 24px;">${bodyHtml}</td></tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                     padding:20px 32px;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0 0 5px;">
              &copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.
            </p>
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              Questions? Email us at
              <a href="mailto:${FROM_EMAIL}"
                 style="color:${PRIMARY};text-decoration:none;">${FROM_EMAIL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Invoice HTML builder ────────────────────────────────────────────────── */
/**
 * @param {object} order        - Mongoose Order document (populated)
 * @param {string} userName     - Customer's display name
 * @param {object} [payment]    - Optional { method, paymentId, paidAt }
 */
function buildInvoiceHtml(order, userName, payment = {}) {
  const label     = publicOrderLabel(order);
  const orderDate = fmtDateTime(order.createdAt);
  const addr      = order.shippingAddress || {};

  /* Payment fields — prefer explicit arg, fall back to order fields */
  const paymentId     = payment.paymentId  || order.paymentResult?.razorpayPaymentId || null;
  const paymentMethod = payment.method     || order.paymentMethod || null;
  const paidAt        = payment.paidAt     || order.paidAt        || order.createdAt;

  /* Extra deductions */
  const walletUsed      = Number(order.walletAmountUsed    || 0);
  const pointsValue     = Number(order.pointsRedeemedValue || 0);
  const pointsRedeemed  = Number(order.pointsRedeemed      || 0);

  /* ── Item rows ── */
  const itemRows = (order.orderItems || []).map((item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;
                 font-size:14px;color:#374151;">${item.name}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;
                 font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;
                 font-size:14px;color:#374151;text-align:right;">${fmt(item.price)}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;
                 font-size:14px;font-weight:700;color:#111827;text-align:right;">
        ${fmt(item.price * item.quantity)}
      </td>
    </tr>`).join('');

  /* ── Price breakdown rows ── */
  const discountRow = Number(order.discountAmount) > 0 ? `
    <tr>
      <td style="padding:5px 0;font-size:13px;color:#16a34a;">Coupon Discount</td>
      <td style="padding:5px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">
        − ${fmt(order.discountAmount)}
      </td>
    </tr>` : '';

  const walletRow = walletUsed > 0 ? `
    <tr>
      <td style="padding:5px 0;font-size:13px;color:#7c3aed;">Wallet</td>
      <td style="padding:5px 0;font-size:13px;color:#7c3aed;font-weight:600;text-align:right;">
        − ${fmt(walletUsed)}
      </td>
    </tr>` : '';

  const pointsRow = pointsValue > 0 ? `
    <tr>
      <td style="padding:5px 0;font-size:13px;color:#7c3aed;">
        Reward Points (${pointsRedeemed} pts)
      </td>
      <td style="padding:5px 0;font-size:13px;color:#7c3aed;font-weight:600;text-align:right;">
        − ${fmt(pointsValue)}
      </td>
    </tr>` : '';

  /* ── Payment details block ── */
  const paymentDetailsBlock = `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:18px 20px;margin-bottom:24px;">
      <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                letter-spacing:0.1em;margin:0 0 12px;font-weight:700;">
        💳 Payment Details
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">

        ${paymentMethod ? `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;width:48%;">Method</td>
          <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:700;text-align:right;">
            ${fmtPaymentMethod(paymentMethod)}
          </td>
        </tr>` : ''}

        ${paymentId ? `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;">Payment ID</td>
          <td style="padding:5px 0;font-size:12px;color:#374151;font-weight:600;
                     text-align:right;font-family:monospace;letter-spacing:0.03em;">
            ${paymentId}
          </td>
        </tr>` : ''}

        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;">Paid on</td>
          <td style="padding:5px 0;font-size:13px;color:#374151;font-weight:600;text-align:right;">
            ${fmtDateTime(paidAt)}
          </td>
        </tr>

        ${order.couponCode ? `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;">Coupon</td>
          <td style="padding:5px 0;text-align:right;">
            <span style="background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;
                         padding:3px 8px;border-radius:6px;letter-spacing:0.05em;">
              ${order.couponCode}
            </span>
          </td>
        </tr>` : ''}

        <tr>
          <td colspan="2"
              style="padding:10px 0 0;border-top:1px solid #e5e7eb;margin-top:8px;">
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;font-weight:800;color:#111827;">
            Total Paid
          </td>
          <td style="padding:4px 0;font-size:16px;font-weight:900;
                     color:${PRIMARY};text-align:right;">
            ${fmt(order.totalPrice)}
          </td>
        </tr>

      </table>
    </div>`;

  const body = `
    <!-- Success badge -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:60px;height:60px;
                  background:#dcfce7;border-radius:50%;
                  line-height:60px;font-size:30px;margin-bottom:14px;">✅</div>
      <h1 style="font-size:23px;font-weight:800;color:#111827;margin:0 0 8px;">
        Order Confirmed!
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Hi <strong>${userName || 'there'}</strong>, thank you for shopping with us 💕
      </p>
    </div>

    <!-- Order meta chips -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border:1px solid #e5e7eb;
                  border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 5px;">Order</p>
          <p style="font-size:15px;font-weight:800;color:#111827;margin:0;">${label}</p>
        </td>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 5px;">Date</p>
          <p style="font-size:13px;font-weight:700;color:#111827;margin:0;">${orderDate}</p>
        </td>
        <td style="padding:14px 16px;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 5px;">Status</p>
          <p style="font-size:14px;font-weight:800;color:#16a34a;margin:0;">Paid ✓</p>
        </td>
      </tr>
    </table>

    <!-- Items table -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:20px;border:1px solid #e5e7eb;
                  border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:left;">Product</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:center;">Qty</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:right;">Price</th>
          <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Price breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td>
        <td style="padding:5px 0;font-size:13px;color:#374151;text-align:right;">
          ${fmt(order.itemsPrice)}
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">Shipping</td>
        <td style="padding:5px 0;font-size:13px;text-align:right;
                   ${Number(order.shippingPrice) === 0 ? 'color:#16a34a;font-weight:700;' : 'color:#374151;'}">
          ${Number(order.shippingPrice) === 0 ? 'FREE 🎉' : fmt(order.shippingPrice)}
        </td>
      </tr>
      ${discountRow}
      ${walletRow}
      ${pointsRow}
      <tr>
        <td colspan="2" style="padding:8px 0 0;">
          <hr style="border:none;border-top:2px solid #e5e7eb;margin:0;"/>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#111827;">
          Grand Total
        </td>
        <td style="padding:10px 0 0;font-size:18px;font-weight:900;
                   color:${PRIMARY};text-align:right;">
          ${fmt(order.totalPrice)}
        </td>
      </tr>
    </table>

    <!-- Payment details -->
    ${paymentDetailsBlock}

    <!-- Shipping address -->
    ${addr.addressLine1 ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:18px 20px;margin-bottom:24px;">
      <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                letter-spacing:0.1em;margin:0 0 10px;font-weight:700;">
        📍 Delivery Address
      </p>
      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;">
        ${addr.fullName || ''}
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 2px;">
        ${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 2px;">
        ${addr.city}, ${addr.state} — ${addr.pincode}
      </p>
      ${addr.phone ? `<p style="font-size:13px;color:#6b7280;margin:6px 0 0;">📞 ${addr.phone}</p>` : ''}
    </div>` : ''}

    <!-- CTA -->
    <div style="padding-top:4px;">
      ${emailButton(`${SITE_URL}/profile/orders`, 'View My Order →')}
      <p style="font-size:12px;color:#9ca3af;margin-top:14px;text-align:center;">
        We'll email you again when your order ships 🚀
      </p>
    </div>`;

  return wrapLayout(body, `Your ${SITE_NAME} order ${label} is confirmed — thank you!`);
}

/* ─── Core send ───────────────────────────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER / EMAIL_PASS not configured — skipping', to);
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
        to,
        subject,
        html,
        /* ── Anti-spam headers ── */
        headers: {
          'X-Mailer': `${SITE_NAME} Mailer`,
          'X-Entity-Ref-ID': `${SITE_NAME}-${Date.now()}`,
          'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=unsubscribe>`,
          'Precedence': 'bulk',
        },
      });
    }
    console.log(`[email] ✅ Sent "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[email] ❌ "${subject}" → ${to}:`, err?.message || err);
  }
}

/* ─── Public API ──────────────────────────────────────────────────────────── */

/**
 * Branded invoice email — sent right after Razorpay payment is confirmed.
 * @param {string} email
 * @param {object} order        - full order document
 * @param {string} userName
 * @param {object} [payment]    - { method, paymentId, paidAt }
 */
exports.sendInvoiceEmail = async (email, order, userName, payment = {}) => {
  const label = publicOrderLabel(order);
  await sendEmail({
    to: email,
    subject: `Order Confirmed ${label} - ${SITE_NAME}`,
    html: buildInvoiceHtml(order, userName, payment),
  });
};

/** Backward-compat alias used by orderController */
exports.sendOrderConfirmationEmail = exports.sendInvoiceEmail;

/* ── Other transactional emails ─────────────────────────────────────────── */

exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;">🔐</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 10px;">
        Reset Your Password
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Click the button below to set a new password.<br/>
        This link expires in <strong>10 minutes</strong>.
      </p>
    </div>
    <div style="margin-bottom:20px;">
      ${emailButton(resetUrl, 'Reset My Password →')}
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;">
      Didn't request this? Ignore this email — your account is safe.
    </p>`;
  await sendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    html: wrapLayout(body),
  });
};

exports.sendOrderStatusEmail = async (email, order, status, userName) => {
  const label = publicOrderLabel(order);
  const emoji = { Shipped: '📦', 'Out for Delivery': '🚚', Delivered: '🎉' }[status] || '📋';
  const body  = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;">${emoji}</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">
        Order ${status}
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Hi <strong>${userName || 'there'}</strong>,
        your order <strong>${label}</strong> has been updated.
      </p>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-size:16px;font-weight:800;color:${PRIMARY};
                margin:0 0 ${order.trackingNumber ? '8px' : '0'};">${status}</p>
      ${order.trackingNumber
        ? `<p style="font-size:13px;color:#6b7280;margin:0;">
             Tracking #: <strong>${order.trackingNumber}</strong>
           </p>` : ''}
    </div>
    ${emailButton(`${SITE_URL}/profile/orders`, 'Track My Order →')}`;
  await sendEmail({
    to: email,
    subject: `${emoji} ${SITE_NAME} order ${label} — ${status}`,
    html: wrapLayout(body),
  });
};

/* ── Fetch live notification emails from DB, fall back to env constant ───── */
async function getAdminEmails() {
  try {
    const NotificationSettings = require('../models/NotificationSettings');
    const settings = await NotificationSettings.findOne();
    if (settings && settings.emails.length > 0) return settings.emails;
  } catch (_) {}
  return [ADMIN_NOTIFY_EMAIL];
}

/* ── Admin: new user registered ─────────────────────────────────────────── */
exports.sendAdminNewUserEmail = async (user) => {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;">👤</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">
        New User Registered
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        A new customer just signed up on ${SITE_NAME}.
      </p>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">Name</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${user.name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${user.email || '—'}</td>
        </tr>
        ${user.phone ? `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Phone</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">${user.phone}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Source</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;text-transform:capitalize;">
            ${user.acquisitionSource || 'direct'}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Registered</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">
            ${fmtDateTime(user.createdAt || new Date())}
          </td>
        </tr>
      </table>
    </div>

    ${emailButton(`${SITE_URL}/admin/users/${user._id}`, 'View User in Admin →')}`;

  const adminEmails = await getAdminEmails();
  await sendEmail({
    to: adminEmails.join(', '),
    subject: `👤 New signup: ${user.name || user.email} — ${SITE_NAME}`,
    html: wrapLayout(body, `New user registered: ${user.email}`),
  });
};

/* ── Admin: new order placed ────────────────────────────────────────────── */
exports.sendAdminNewOrderEmail = async (order, customerName, customerEmail) => {
  const label = publicOrderLabel(order);
  const addr  = order.shippingAddress || {};

  const itemRows = (order.orderItems || []).map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">
        ${item.name}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;
                 color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;
                 font-weight:700;color:#111827;text-align:right;">
        ${fmt(item.price * item.quantity)}
      </td>
    </tr>`).join('');

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;">🛍️</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">
        New Order Placed
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Order <strong>${label}</strong> just came in.
      </p>
    </div>

    <!-- Order meta -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:20px;">
      <tr>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 4px;">Order</p>
          <p style="font-size:15px;font-weight:800;color:#111827;margin:0;">${label}</p>
        </td>
        <td style="padding:14px 16px;border-right:1px solid #e5e7eb;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 4px;">Total</p>
          <p style="font-size:15px;font-weight:800;color:${PRIMARY};margin:0;">${fmt(order.totalPrice)}</p>
        </td>
        <td style="padding:14px 16px;width:33%;">
          <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:0.08em;margin:0 0 4px;">Payment</p>
          <p style="font-size:13px;font-weight:700;color:#111827;margin:0;">
            ${fmtPaymentMethod(order.paymentMethod)}
          </p>
        </td>
      </tr>
    </table>

    <!-- Customer -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:16px 20px;margin-bottom:20px;">
      <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                letter-spacing:0.1em;margin:0 0 10px;font-weight:700;">👤 Customer</p>
      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 3px;">${customerName || '—'}</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">${customerEmail || '—'}</p>
    </div>

    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:9px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:left;">Item</th>
          <th style="padding:9px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:center;">Qty</th>
          <th style="padding:9px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
                     letter-spacing:0.06em;color:#6b7280;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Shipping address -->
    ${addr.addressLine1 ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:10px;color:#9ca3af;text-transform:uppercase;
                letter-spacing:0.1em;margin:0 0 8px;font-weight:700;">📍 Ship To</p>
      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 3px;">${addr.fullName || ''}</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 2px;">
        ${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0;">
        ${addr.city}, ${addr.state} — ${addr.pincode}
      </p>
      ${addr.phone ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0;">📞 ${addr.phone}</p>` : ''}
    </div>` : ''}

    ${emailButton(`${SITE_URL}/admin/orders`, 'View in Admin Panel →')}`;

  const adminEmails = await getAdminEmails();
  await sendEmail({
    to: adminEmails.join(', '),
    subject: `🛍️ New order ${label} — ${fmt(order.totalPrice)} — ${SITE_NAME}`,
    html: wrapLayout(body, `New order ${label} placed by ${customerName}`),
  });
};

exports.sendAbandonedCartEmail = async (email, userName, cartItems) => {
  const rows = cartItems.map((i) =>
    `<li style="padding:5px 0;font-size:14px;color:#374151;">
       ${i.name || 'Item'} <span style="color:#6b7280;">× ${i.quantity}</span>
     </li>`
  ).join('');
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:12px;">🛒</div>
      <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">
        You left something behind!
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Hey <strong>${userName}</strong>, your beauty picks are still waiting.
      </p>
    </div>
    <ul style="list-style:none;padding:0;background:#f9fafb;
               border:1px solid #e5e7eb;border-radius:12px;
               padding:16px;margin-bottom:24px;">${rows}</ul>
    ${emailButton(`${SITE_URL}/cart`, 'Complete My Purchase →')}
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:14px;">
      Stock is limited — don't miss out! 💕
    </p>`;
  await sendEmail({
    to: email,
    subject: `🛒 ${userName}, your ${SITE_NAME} cart misses you!`,
    html: wrapLayout(body),
  });
};

/* ── Marketing campaign email ───────────────────────────────────────────────── */
/**
 * Sends an admin-authored campaign email to a single recipient.
 * The htmlBody is the inner content; it will be wrapped in the standard layout.
 */
exports.renderCampaignHtml = function ({ htmlBody = '', previewText = '', userName = '' }) {
  const greeting = userName
    ? `<p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Hi <strong>${userName}</strong>,</p>`
    : '';
  const body = `${greeting}${htmlBody}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:32px;">
      You received this email because you have an account with ${SITE_NAME}.
      <a href="mailto:${FROM_EMAIL}?subject=unsubscribe" style="color:${PRIMARY};text-decoration:none;">Unsubscribe</a>
    </p>`;
  return wrapLayout(body, previewText);
};

exports.sendCampaignEmail = async ({ to, subject, previewText = '', htmlBody, userName, cartItems }) => {
  const greeting = userName
    ? `<p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Hi <strong>${userName}</strong>,</p>`
    : '';

  let cartSection = '';
  if (cartItems?.length) {
    const rows = cartItems.map((i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:13px;color:#374151;">${i.name}</span>
          <span style="font-size:12px;color:#9ca3af;"> × ${i.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;color:#374151;">
          ₹${Number(i.price * i.quantity).toFixed(0)}
        </td>
      </tr>`).join('');
    cartSection = `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 12px;">Your cart</p>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </div>
      ${emailButton(`${SITE_URL}/cart`, 'Complete My Purchase →')}`;
  }

  const body = `${greeting}${htmlBody}${cartSection}
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:32px;">
      You received this email because you have an account with ${SITE_NAME}.
      <a href="mailto:${FROM_EMAIL}?subject=unsubscribe" style="color:${PRIMARY};text-decoration:none;">Unsubscribe</a>
    </p>`;
  await sendEmail({
    to,
    subject,
    html: wrapLayout(body, previewText),
  });
};
