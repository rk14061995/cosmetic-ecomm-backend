const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  const {
    entity,
    action,
    search,
    page = 1,
    limit = 30,
  } = req.query;

  const query = {};
  if (entity) query.entity = entity;
  if (action) query.action = action;
  if (search) query.entityName = { $regex: search, $options: 'i' };

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  res.json({
    success: true,
    logs,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
};
