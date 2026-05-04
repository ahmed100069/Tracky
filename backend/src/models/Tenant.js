import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: String,
    city: String,
    plan: { type: String, default: "starter" },
    brandColor: { type: String, default: "#a16207" },
    currency: { type: String, default: "INR" },
    ownerPinHash: String,
    reporting: {
      whatsappEnabled: { type: Boolean, default: false },
      provider: { type: String, enum: ["webhook", "twilio"], default: "webhook" },
      whatsappNumber: String,
      whatsappWebhookUrl: String,
      twilioAccountSid: String,
      twilioAuthToken: String,
      twilioFromNumber: String,
      sendHour: { type: Number, default: 22 },
      lastDailyReportSentAt: Date
    }
  },
  { timestamps: true }
);

export const Tenant = mongoose.model("Tenant", tenantSchema);
