/**
 * MSG91 / SMS OTP — DISABLED (implementation commented below for reference).
 * Re-enable by restoring the block at the bottom and wiring auth routes + controller.
 */

const OTP_EXPIRY_MINUTES = 10;

function normalizeIndianMobile(/* phone */) {
  return '';
}

async function sendOtpSms(/* phone, otp */) {
  throw new Error('SMS OTP (MSG91) is disabled in this deployment.');
}

module.exports = {
  sendOtpSms,
  normalizeIndianMobile,
  OTP_EXPIRY_MINUTES,
};

/*
 * ─── Original MSG91 integration ─────────────────────────────────────────────
 *
 * const DEFAULT_COUNTRY_CODE = process.env.MSG91_COUNTRY_CODE || '91';
 * const OTP_EXPIRY_MINUTES = Number(process.env.MSG91_OTP_EXPIRY_MINUTES || 10);
 *
 * function normalizeIndianMobile(phone) {
 *   const digits = String(phone || '').replace(/\D/g, '');
 *   if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
 *   if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;
 *   return '';
 * }
 *
 * async function sendOtpSms(phone, otp) {
 *   const authKey = process.env.MSG91_AUTH_KEY;
 *   const templateId = process.env.MSG91_TEMPLATE_ID;
 *   const mobile = normalizeIndianMobile(phone);
 *
 *   if (!authKey || !templateId) {
 *     throw new Error('MSG91 is not configured. Set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID');
 *   }
 *   if (!mobile) {
 *     throw new Error('Invalid phone number for OTP');
 *   }
 *
 *   const url = new URL('https://control.msg91.com/api/v5/otp');
 *   url.searchParams.set('template_id', templateId);
 *   url.searchParams.set('mobile', mobile);
 *   url.searchParams.set('authkey', authKey);
 *   url.searchParams.set('otp', String(otp));
 *   url.searchParams.set('otp_expiry', String(OTP_EXPIRY_MINUTES));
 *
 *   const response = await fetch(url, {
 *     method: 'POST',
 *     headers: {
 *       'content-type': 'application/json',
 *     },
 *   });
 *
 *   let data = {};
 *   try {
 *     data = await response.json();
 *   } catch {
 *     data = {};
 *   }
 *
 *   if (!response.ok) {
 *     throw new Error(data?.message || `MSG91 OTP failed with status ${response.status}`);
 *   }
 *
 *   return data;
 * }
 *
 * module.exports = {
 *   sendOtpSms,
 *   normalizeIndianMobile,
 *   OTP_EXPIRY_MINUTES,
 * };
 */
