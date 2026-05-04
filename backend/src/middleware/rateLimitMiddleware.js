import { ApiError } from "../utils/apiError.js";

const buckets = new Map();

export const rateLimit = ({ windowMs = 60000, max = 120 } = {}) => (req, _res, next) => {
  const key = `${req.ip}:${req.user?._id || "guest"}:${req.baseUrl}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.expiresAt) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return next();
  }

  if (bucket.count >= max) {
    return next(new ApiError(429, "Too many requests. Please wait a moment."));
  }

  bucket.count += 1;
  next();
};
