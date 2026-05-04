import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["raw-material", "salary", "rent", "gas", "misc"],
      default: "misc"
    },
    spentOn: { type: Date, default: Date.now },
    notes: String
  },
  { timestamps: true }
);

expenseSchema.index({ tenantId: 1, spentOn: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
