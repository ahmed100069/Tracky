import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true
    },
    menuItemName: String,
    name: String,
    portionLabel: String,
    quantity: Number,
    unitPrice: Number,
    lineTotal: Number,
    estimatedCost: { type: Number, default: 0 },
    lineProfit: { type: Number, default: 0 }
  },
  { _id: false }
);

const paymentLineSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["cash", "upi", "card", "udhar"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    clientOrderId: { type: String, required: true },
    orderNumber: { type: String, required: true },
    deviceId: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    grossProfit: { type: Number, default: 0 },
    payments: [paymentLineSchema],
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "udhar", "split"],
      default: "cash"
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },
    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed"
    },
    source: {
      type: String,
      enum: ["manual", "voice"],
      default: "manual"
    },
    notes: String,
    printedAt: Date,
    localCreatedAt: Date,
    syncedAt: Date,
    editedAt: Date,
    cancelledAt: Date,
    revision: { type: Number, default: 1 },
    editCount: { type: Number, default: 0 },
    approvals: {
      udharApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      discountApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      postPrintEditApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      cancelApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    }
  },
  { timestamps: true }
);

orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ tenantId: 1, clientOrderId: 1 }, { unique: true });

export const Order = mongoose.model("Order", orderSchema);
