import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    name: { type: String, required: true },
    phone: String,
    outstandingAmount: { type: Number, default: 0 },
    lastCreditDate: Date,
    notes: String
  },
  { timestamps: true }
);

customerSchema.index({ tenantId: 1, name: 1 });

export const Customer = mongoose.model("Customer", customerSchema);
