import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    name: { type: String, required: true },
    unit: { type: String, default: "kg" },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    estimatedUnitCost: { type: Number, default: 0 }
  },
  { timestamps: true }
);

inventoryItemSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
