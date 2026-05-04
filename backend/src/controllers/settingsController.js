import { body } from "express-validator";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { endOfDay, startOfDay } from "../utils/date.js";

export const getBootstrapSettings = asyncHandler(async (req, res) => {
  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [tenant, staff, todayOrders, recentAudits] = await Promise.all([
    Tenant.findById(req.user.tenantId),
    User.find({ tenantId: req.user.tenantId }).select("name email role createdAt"),
    Order.find({ tenantId: req.user.tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
    AuditLog.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(20)
  ]);

  const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const totalProfit = todayOrders.reduce((sum, order) => sum + (order.grossProfit || 0), 0);
  const cancelledOrders = todayOrders.filter((order) => order.status === "cancelled").length;
  const discountOrders = todayOrders.filter((order) => Number(order.discount || 0) > 0).length;

  const whatsappPreview = [
    `Tracky Daily Summary - ${new Date().toLocaleDateString("en-IN")}`,
    `Sales: Rs ${Math.round(totalSales)}`,
    `Gross Profit: Rs ${Math.round(totalProfit)}`,
    `Orders: ${todayOrders.length}`,
    `Cancelled Bills: ${cancelledOrders}`,
    `Discounted Bills: ${discountOrders}`,
    totalProfit < totalSales * 0.2 ? "Insight: Margin is thin today. Check discounts and raw material cost." : "Insight: Margin looks healthy today.",
    cancelledOrders > 2 ? "Action: Review staff cancellation reasons before closing shift." : "Action: Keep fast-moving dishes visible during rush hours."
  ].join("\n");

  res.json({
    tenant: tenant
      ? {
          ...tenant.toObject(),
          ownerPinEnabled: Boolean(tenant.ownerPinHash)
        }
      : null,
    staff,
    recentActivity: recentAudits.map((audit) => ({
      id: audit._id,
      entityType: audit.entityType,
      action: audit.action,
      createdAt: audit.createdAt,
      meta: audit.meta
    })),
    whatsappPreview
  });
});

export const reportingSettingsValidation = [
  body("whatsappEnabled").optional().isBoolean().withMessage("WhatsApp enabled must be true or false"),
  body("provider").optional().isIn(["webhook", "twilio"]).withMessage("Provider must be webhook or twilio"),
  body("whatsappNumber").optional().isString().withMessage("WhatsApp number must be text"),
  body("whatsappWebhookUrl").optional().isString().withMessage("Webhook URL must be text"),
  body("twilioAccountSid").optional().isString().withMessage("Twilio Account SID must be text"),
  body("twilioAuthToken").optional().isString().withMessage("Twilio Auth Token must be text"),
  body("twilioFromNumber").optional().isString().withMessage("Twilio from number must be text"),
  body("sendHour").optional().isInt({ min: 0, max: 23 }).withMessage("Send hour must be between 0 and 23")
];

export const updateReportingSettings = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) {
    return res.status(404).json({ message: "Tenant not found" });
  }

  tenant.reporting = {
    ...tenant.reporting,
    whatsappEnabled:
      typeof req.body.whatsappEnabled === "undefined"
        ? tenant.reporting?.whatsappEnabled || false
        : Boolean(req.body.whatsappEnabled),
    provider:
      typeof req.body.provider === "undefined"
        ? tenant.reporting?.provider || "webhook"
        : String(req.body.provider || "webhook"),
    whatsappNumber:
      typeof req.body.whatsappNumber === "undefined"
        ? tenant.reporting?.whatsappNumber || ""
        : String(req.body.whatsappNumber || "").trim(),
    whatsappWebhookUrl:
      typeof req.body.whatsappWebhookUrl === "undefined"
        ? tenant.reporting?.whatsappWebhookUrl || ""
        : String(req.body.whatsappWebhookUrl || "").trim(),
    twilioAccountSid:
      typeof req.body.twilioAccountSid === "undefined"
        ? tenant.reporting?.twilioAccountSid || ""
        : String(req.body.twilioAccountSid || "").trim(),
    twilioAuthToken:
      typeof req.body.twilioAuthToken === "undefined"
        ? tenant.reporting?.twilioAuthToken || ""
        : String(req.body.twilioAuthToken || "").trim(),
    twilioFromNumber:
      typeof req.body.twilioFromNumber === "undefined"
        ? tenant.reporting?.twilioFromNumber || ""
        : String(req.body.twilioFromNumber || "").trim(),
    sendHour:
      typeof req.body.sendHour === "undefined"
        ? tenant.reporting?.sendHour ?? 22
        : Number(req.body.sendHour)
  };

  await tenant.save();

  res.json({
    ok: true,
    reporting: tenant.reporting
  });
});
