import { Tenant } from "../models/Tenant.js";
import { buildDailyReport } from "./reportService.js";
import { completeJob, claimNextJob, failJob } from "./jobService.js";
import { sendWhatsappReport } from "./whatsappService.js";

const processWhatsappDailyReportJob = async (job) => {
  const tenant = await Tenant.findById(job.tenantId);
  if (!tenant) {
    await completeJob(job._id);
    return;
  }

  const report = await buildDailyReport({
    tenantId: tenant._id,
    date: job.payload?.date || new Date()
  });

  const result = await sendWhatsappReport({ tenant, report });
  if (result.ok) {
    tenant.reporting.lastDailyReportSentAt = new Date();
    await tenant.save();
  }

  await completeJob(job._id);
};

const handlers = {
  "whatsapp-daily-report": processWhatsappDailyReportJob
};

export const processAvailableJobs = async () => {
  let processed = 0;

  for (const type of Object.keys(handlers)) {
    let keepGoing = true;
    while (keepGoing) {
      const job = await claimNextJob(type);
      if (!job) {
        keepGoing = false;
        continue;
      }

      try {
        await handlers[type](job);
        processed += 1;
      } catch (error) {
        await failJob(job._id, error?.message || "job-failed");
      }
    }
  }

  return processed;
};

let workerHandle = null;

export const startJobWorker = () => {
  if (workerHandle || process.env.ENABLE_JOB_WORKER === "false") {
    return;
  }

  workerHandle = setInterval(() => {
    processAvailableJobs().catch((error) => console.error("Job worker pass failed", error));
  }, 10000);
  workerHandle.unref?.();

  processAvailableJobs().catch((error) => console.error("Initial job worker pass failed", error));
};
