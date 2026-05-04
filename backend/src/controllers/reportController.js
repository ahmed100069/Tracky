import { body } from "express-validator";
import { Tenant } from "../models/Tenant.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildDailyReport } from "../services/reportService.js";
import { sendWhatsappReport } from "../services/whatsappService.js";

export const getWhatsappDailyReport = asyncHandler(async (req, res) => {
  const report = await buildDailyReport({
    tenantId: req.user.tenantId,
    date: req.query.date || new Date()
  });

  res.json(report);
});

export const sendWhatsappDailyReportValidation = [
  body("date").optional().isISO8601().withMessage("Date must be a valid ISO date")
];

export const sendWhatsappDailyReport = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  const report = await buildDailyReport({
    tenantId: req.user.tenantId,
    date: req.body.date || new Date()
  });

  const result = await sendWhatsappReport({ tenant, report });
  if (result.ok) {
    tenant.reporting.lastDailyReportSentAt = new Date();
    await tenant.save();
  }

  res.json({
    ok: Boolean(result.ok),
    skipped: Boolean(result.skipped),
    reason: result.reason,
    report
  });
});
