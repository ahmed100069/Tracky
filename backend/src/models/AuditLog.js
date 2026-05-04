import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ["order", "customer", "inventory", "settings", "menu", "category"],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    action: {
      type: String,
      enum: ["create", "edit", "delete", "cancel", "udhar-approved", "payment", "price-change", "stock-adjustment", "import", "export", "availability-toggle"],
      required: true
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    ownerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
