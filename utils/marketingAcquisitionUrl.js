/**
 * Builds a share URL that sets first-touch acquisition params (see `lib/attribution.ts` on the storefront).
 * Only adds utm_source / utm_medium / utm_campaign when missing — never overwrites existing values.
 */

const DEFAULT_MEDIUM = {
  instagram: 'social',
  whatsapp: 'social',
  google_ads: 'cpc',
  web: 'organic',
  other: 'referral',
};

function slugCampaign(label) {
  const s = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || 'campaign';
}

function hasAttributionSource(searchParams) {
  return !!(
    searchParams.get('utm_source') ||
    searchParams.get('from') ||
    searchParams.get('src') ||
    searchParams.get('source')
  );
}

function mergeAcquisitionParams(absUrl, channel, label) {
  let u;
  try {
    u = new URL(absUrl);
  } catch {
    return absUrl;
  }

  const defaultSource = String(channel || 'web').trim() || 'web';
  const defaultMedium = DEFAULT_MEDIUM[channel] || 'referral';

  if (!hasAttributionSource(u.searchParams)) {
    u.searchParams.set('utm_source', defaultSource);
  }
  if (!u.searchParams.get('utm_medium')) {
    u.searchParams.set('utm_medium', defaultMedium);
  }
  if (!u.searchParams.get('utm_campaign')) {
    u.searchParams.set('utm_campaign', slugCampaign(label));
  }

  return u.toString();
}

function enrichLinkDoc(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const { url, channel, label } = plain;
  return {
    ...plain,
    acquisitionUrl: mergeAcquisitionParams(url, channel, label),
  };
}

module.exports = {
  mergeAcquisitionParams,
  enrichLinkDoc,
  DEFAULT_MEDIUM,
};
