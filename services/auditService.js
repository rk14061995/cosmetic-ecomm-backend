const AuditLog = require('../models/AuditLog');

const SKIP_FIELDS = new Set([
  '_id', '__v', 'createdAt', 'updatedAt', 'slug',
  'reviews', 'ratings', 'numReviews',
]);

function serialize(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

function diffDocs(oldDoc, newDoc) {
  const changes = [];
  const oldObj = oldDoc && typeof oldDoc.toObject === 'function' ? oldDoc.toObject() : (oldDoc || {});
  const newObj = newDoc && typeof newDoc.toObject === 'function' ? newDoc.toObject() : (newDoc || {});

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;
    const oldSerialized = serialize(oldObj[key]);
    const newSerialized = serialize(newObj[key]);
    if (oldSerialized !== newSerialized) {
      changes.push({ field: key, oldValue: oldObj[key] ?? null, newValue: newObj[key] ?? null });
    }
  }

  return changes;
}

async function logAudit({ entity, entityId, entityName, action, oldDoc, newDoc, performedBy }) {
  try {
    const changes = action === 'update' ? diffDocs(oldDoc, newDoc) : [];

    if (action === 'update' && changes.length === 0) return;

    const entry = {
      entity,
      entityId,
      entityName: String(entityName || ''),
      action,
      changes,
      performedBy: performedBy
        ? {
            userId: performedBy._id,
            name: performedBy.name || performedBy.email || 'Admin',
            email: performedBy.email || '',
          }
        : undefined,
    };

    await AuditLog.create(entry);
  } catch (err) {
    console.error('[auditService] Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
