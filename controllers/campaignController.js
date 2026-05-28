const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Subscription = require('../models/Subscription');
const AnnouncementBanner = require('../models/AnnouncementBanner');
const { sendCampaignEmail, renderCampaignHtml } = require('../services/emailService');

/* ── CRUD ───────────────────────────────────────────────────────────────── */

exports.getCampaigns = async (req, res) => {
  const campaigns = await Campaign.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  res.json({ campaigns });
};

exports.getCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('specificUserIds', 'name email');
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json({ campaign });
};

exports.createCampaign = async (req, res) => {
  const campaign = await Campaign.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ campaign });
};

exports.updateCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status === 'sending') {
    return res.status(400).json({ message: 'Cannot edit a campaign while it is sending' });
  }
  Object.assign(campaign, req.body);
  await campaign.save();
  res.json({ campaign });
};

exports.deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status === 'sending') {
    return res.status(400).json({ message: 'Cannot delete a campaign while it is sending' });
  }
  await campaign.deleteOne();
  res.json({ message: 'Deleted' });
};

/* ── Recipient count preview ─────────────────────────────────────────────── */

exports.previewCampaign = async (req, res) => {
  const { segment = 'all', specificUserIds, filters } = req.query;
  let parsedFilters = {};
  let parsedSpecific = [];
  try { parsedFilters = filters ? JSON.parse(filters) : {}; } catch { parsedFilters = {}; }
  try { parsedSpecific = specificUserIds ? JSON.parse(specificUserIds) : []; } catch { parsedSpecific = []; }
  const count = await getRecipientCount(segment, parsedFilters, parsedSpecific);
  res.json({ segment, recipientCount: count });
};

/* ── HTML preview ────────────────────────────────────────────────────────── */

exports.renderPreview = async (req, res) => {
  const { htmlBody = '', previewText = '', userName = 'Preview User' } = req.body;
  const html = renderCampaignHtml({ htmlBody, previewText, userName });
  res.json({ html });
};

/* ── Test send ───────────────────────────────────────────────────────────── */

exports.testSend = async (req, res) => {
  const { to, subject, htmlBody, previewText } = req.body;
  if (!to || !subject || !htmlBody) {
    return res.status(400).json({ message: 'to, subject, and htmlBody are required' });
  }
  await sendCampaignEmail({
    to,
    subject: `[TEST] ${subject}`,
    previewText,
    htmlBody,
    userName: 'Test Recipient',
  });
  res.json({ message: `Test email sent to ${to}` });
};

/* ── Marketing stats ─────────────────────────────────────────────────────── */

exports.getStats = async (req, res) => {
  const [totalCampaigns, sentCampaigns, scheduledCampaigns, draftCampaigns, activeBanners, agg, lastSent] =
    await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'sent' }),
      Campaign.countDocuments({ status: 'draft', scheduledAt: { $ne: null } }),
      Campaign.countDocuments({ status: 'draft', scheduledAt: null }),
      AnnouncementBanner.countDocuments({ isActive: true, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] }),
      Campaign.aggregate([{ $group: { _id: null, total: { $sum: '$recipientCount' } } }]),
      Campaign.findOne({ status: 'sent' }).sort({ sentAt: -1 }).select('name sentAt recipientCount'),
    ]);

  res.json({
    totalCampaigns,
    sentCampaigns,
    scheduledCampaigns,
    draftCampaigns,
    activeBanners,
    totalEmailsDelivered: agg[0]?.total ?? 0,
    lastSent: lastSent
      ? { name: lastSent.name, sentAt: lastSent.sentAt, recipientCount: lastSent.recipientCount }
      : null,
  });
};

/* ── Send now ────────────────────────────────────────────────────────────── */

exports.sendCampaign = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status === 'sending') return res.status(400).json({ message: 'Already sending' });
  if (campaign.status === 'sent') {
    return res.status(400).json({ message: 'Already sent. Duplicate this campaign to resend.' });
  }
  campaign.status = 'sending';
  campaign.scheduledAt = null;
  await campaign.save();
  res.json({ message: 'Campaign send started', campaignId: campaign._id });
  setImmediate(() => dispatchCampaign(campaign));
};

/* ── Scheduled send (called by scheduler) ───────────────────────────────── */

exports.runScheduledCampaigns = async () => {
  const due = await Campaign.find({
    status: 'draft',
    scheduledAt: { $lte: new Date(), $ne: null },
  });
  for (const campaign of due) {
    campaign.status = 'sending';
    await campaign.save();
    dispatchCampaign(campaign).catch(() => {});
  }
};

/* ── Recipient helpers ───────────────────────────────────────────────────── */

async function buildUserQuery(segment, filters = {}) {
  const base = { role: 'user', isBlocked: false };

  if (filters.loyaltyTiers?.length)       base.loyaltyTier        = { $in: filters.loyaltyTiers };
  if (filters.acquisitionSources?.length) base.acquisitionSource  = { $in: filters.acquisitionSources };
  if (filters.joinedAfter || filters.joinedBefore) {
    base.createdAt = {};
    if (filters.joinedAfter)  base.createdAt.$gte = new Date(filters.joinedAfter);
    if (filters.joinedBefore) base.createdAt.$lte = new Date(filters.joinedBefore);
  }

  if (segment === 'customers' || (filters.minOrders ?? 0) > 0) {
    const minCount = segment === 'customers' ? Math.max(1, filters.minOrders ?? 0) : filters.minOrders;
    if (minCount > 1) {
      const agg = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $match: { count: { $gte: minCount } } },
      ]);
      base._id = { $in: agg.map((r) => r._id) };
    } else {
      base._id = { $in: await Order.distinct('user', { isPaid: true }) };
    }
  } else if (segment === 'subscribers') {
    base._id = { $in: await Subscription.distinct('user', { status: 'active' }) };
  } else if (segment === 'abandoned_cart') {
    const recentBuyers = await Order.distinct('user', {
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const carts = await Cart.find({ 'items.0': { $exists: true }, user: { $nin: recentBuyers } }).select('user');
    base._id = { $in: carts.map((c) => c.user) };
  }

  return base;
}

async function getRecipientCount(segment, filters = {}, specificUserIds = []) {
  if (segment === 'specific') return specificUserIds.length;
  return User.countDocuments(await buildUserQuery(segment, filters));
}

async function getRecipients(segment, filters = {}, specificUserIds = []) {
  if (segment === 'specific') {
    return User.find({ _id: { $in: specificUserIds }, isBlocked: false }).select('email name');
  }
  return User.find(await buildUserQuery(segment, filters)).select('email name _id');
}

/* ── Dispatch ────────────────────────────────────────────────────────────── */

async function dispatchCampaign(campaign) {
  try {
    const filters     = campaign.filters?.toObject ? campaign.filters.toObject() : (campaign.filters || {});
    const specificIds = campaign.specificUserIds || [];
    const recipients  = await getRecipients(campaign.segment, filters, specificIds);
    let sent = 0, failed = 0;

    for (const user of recipients) {
      try {
        let cartItems;
        if (campaign.segment === 'abandoned_cart') {
          const cart = await Cart.findOne({ user: user._id }).populate('items.product', 'name images');
          cartItems = (cart?.items || []).map((i) => ({
            name:     i.name || i.product?.name || 'Product',
            quantity: i.quantity,
            price:    i.price,
            image:    i.image || i.product?.images?.[0]?.url || '',
          }));
        }
        await sendCampaignEmail({
          to:          user.email,
          subject:     campaign.subject,
          previewText: campaign.previewText,
          htmlBody:    campaign.htmlBody,
          userName:    user.name,
          cartItems,
        });
        sent++;
      } catch { failed++; }
    }

    campaign.status         = 'sent';
    campaign.sentAt         = new Date();
    campaign.recipientCount = sent;
    campaign.failedCount    = failed;
    await campaign.save();
  } catch (err) {
    campaign.status       = 'failed';
    campaign.errorMessage = err.message || 'Unknown error';
    await campaign.save();
  }
}
