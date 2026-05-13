const MarketingLink = require('../models/MarketingLink');
const { enrichLinkDoc, mergeAcquisitionParams } = require('../utils/marketingAcquisitionUrl');

exports.getPublicLinks = async (req, res) => {
  const { channel } = req.query;
  const query = { isActive: true };
  if (channel) query.channel = channel;

  const links = await MarketingLink.find(query)
    .select('channel label url sortOrder')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  res.json({
    success: true,
    links: links.map((l) => ({
      ...l,
      acquisitionUrl: mergeAcquisitionParams(l.url, l.channel, l.label),
    })),
  });
};

exports.getLinks = async (req, res) => {
  const { channel, active } = req.query;
  const query = {};
  if (channel) query.channel = channel;
  if (active !== undefined) query.isActive = active === 'true';

  const links = await MarketingLink.find(query).sort({ channel: 1, sortOrder: 1, createdAt: -1 }).lean();
  res.json({
    success: true,
    links: links.map((l) => ({
      ...l,
      acquisitionUrl: mergeAcquisitionParams(l.url, l.channel, l.label),
    })),
  });
};

exports.getLink = async (req, res) => {
  const link = await MarketingLink.findById(req.params.id);
  if (!link) return res.status(404).json({ success: false, message: 'Link not found' });
  res.json({ success: true, link: enrichLinkDoc(link) });
};

exports.createLink = async (req, res) => {
  const link = await MarketingLink.create(req.body);
  res.status(201).json({ success: true, link: enrichLinkDoc(link) });
};

exports.updateLink = async (req, res) => {
  const link = await MarketingLink.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!link) return res.status(404).json({ success: false, message: 'Link not found' });
  res.json({ success: true, link: enrichLinkDoc(link) });
};

exports.deleteLink = async (req, res) => {
  const link = await MarketingLink.findByIdAndDelete(req.params.id);
  if (!link) return res.status(404).json({ success: false, message: 'Link not found' });
  res.json({ success: true, message: 'Link deleted' });
};
