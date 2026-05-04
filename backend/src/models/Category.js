import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    rushPriority: { type: Number, default: 0 }
  },
  { timestamps: true }
);

categorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
