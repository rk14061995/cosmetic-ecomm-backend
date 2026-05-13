/** Normalize acquisition source from client (defense in depth; Joi already bounds length). */
function normalizeAcquisitionSource(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().toLowerCase();
  const aliases = {
    ig: 'instagram',
    insta: 'instagram',
    instagram: 'instagram',
    fb: 'facebook',
    meta: 'facebook',
    facebook: 'facebook',
    wa: 'whatsapp',
    whatsapp: 'whatsapp',
    yt: 'youtube',
    youtube: 'youtube',
    tw: 'twitter',
    twitter: 'twitter',
    x: 'twitter',
    tt: 'tiktok',
    tiktok: 'tiktok',
  };
  if (aliases[s]) return aliases[s];
  if (/^[a-z0-9][a-z0-9_-]{0,39}$/.test(s)) return s;
  return '';
}

function pickAttributionFields(attribution) {
  if (!attribution || typeof attribution !== 'object') return null;
  const source = normalizeAcquisitionSource(attribution.source);
  if (!source) return null;
  let capturedAt;
  if (attribution.capturedAt) {
    const d = new Date(attribution.capturedAt);
    capturedAt = Number.isNaN(d.getTime()) ? new Date() : d;
  } else {
    capturedAt = new Date();
  }
  return {
    acquisitionSource: source,
    acquisitionMedium: String(attribution.medium || '')
      .trim()
      .slice(0, 80),
    acquisitionCampaign: String(attribution.campaign || '')
      .trim()
      .slice(0, 120),
    acquisitionLandingPath: String(attribution.landingPath || '')
      .trim()
      .slice(0, 500),
    acquisitionCapturedAt: capturedAt,
  };
}

module.exports = { normalizeAcquisitionSource, pickAttributionFields };
