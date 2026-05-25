const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    entity: {
      type: String,
      required: true,
      enum: ['Product', 'Brand', 'Category'],
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityName: { type: String, required: true },
    action: { type: String, required: true, enum: ['create', 'update', 'delete'], index: true },
    changes: [changeSchema],
    performedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
