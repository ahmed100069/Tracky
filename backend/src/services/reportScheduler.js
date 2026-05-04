import { Tenant } from "../models/Tenant.js";
import { enqueueJob } from "./jobService.js";

let schedulerHandle = null;

const shouldSendNow = (tenant, now) => {
  if (!tenant?.reporting?.whatsappEnabled) return false;

  const sendHour = Number(tenant.reporting.sendHour ?? 22);
  const lastSent = tenant.reporting.lastDailyReportSentAt ? new Date(tenant.reporting.lastDailyReportSentAt) : null;

  if (now.getHours() !== sendHour) return false;
  if (!lastSent) return true;

  return lastSent.toDateString() !== now.toDateString();
};

const runSchedulerPass = async () => {
  const now = new Date();
  const tenants = await Tenant.find({ "reporting.whatsappEnabled": true });

  for (const tenant of tenants) {
    if (!shouldSendNow(tenant, now)) continue;

    try {
      await enqueueJob({
        tenantId: tenant._id,
        type: "whatsapp-daily-report",
        payload: {
          date: now.toISOString()
        }
      });
      tenant.reporting.lastDailyReportSentAt = new Date();
      await tenant.save();
    } catch (error) {
      console.error(`Daily WhatsApp report failed for tenant ${tenant._id}`, error);
    }
  }
};

export const startReportScheduler = () => {
  if (schedulerHandle || process.env.ENABLE_WHATSAPP_REPORT_SCHEDULER === "false") {
    return;
  }

  schedulerHandle = setInterval(() => {
    runSchedulerPass().catch((error) => console.error("Report scheduler pass failed", error));
  }, 5 * 60 * 1000);

  schedulerHandle.unref?.();
  runSchedulerPass().catch((error) => console.error("Initial report scheduler pass failed", error));
};
