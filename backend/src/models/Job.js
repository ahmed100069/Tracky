import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    runAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastError: String,
    completedAt: Date
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, runAt: 1 });

export const Job = mongoose.model("Job", jobSchema);
