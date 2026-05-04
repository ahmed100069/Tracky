import { Job } from "../models/Job.js";

export const enqueueJob = async ({ tenantId, type, payload = {}, runAt = new Date() }) =>
  Job.create({
    tenantId,
    type,
    payload,
    runAt
  });

export const claimNextJob = async (type) => {
  const now = new Date();
  return Job.findOneAndUpdate(
    {
      type,
      status: "pending",
      runAt: { $lte: now }
    },
    {
      $set: {
        status: "processing"
      },
      $inc: {
        attempts: 1
      }
    },
    {
      new: true,
      sort: { runAt: 1, createdAt: 1 }
    }
  );
};

export const completeJob = async (jobId) =>
  Job.findByIdAndUpdate(jobId, {
    $set: {
      status: "completed",
      completedAt: new Date(),
      lastError: ""
    }
  });

export const failJob = async (jobId, errorMessage, retryDelayMs = 5 * 60 * 1000) =>
  Job.findByIdAndUpdate(jobId, {
    $set: {
      status: "pending",
      lastError: errorMessage,
      runAt: new Date(Date.now() + retryDelayMs)
    }
  });
