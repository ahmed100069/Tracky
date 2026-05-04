import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { getSummary } from "./dashboardController.js";
import { subscribeTenantEvents } from "../services/liveUpdates.js";

const createMockRes = (onJson) => ({
  json(payload) {
    onJson(payload);
  },
  status() {
    return this;
  }
});

export const streamDashboard = async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) {
    res.status(401).json({ message: "Authorization token missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select("-password");
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendSummary = async () => {
    await getSummary(req, createMockRes((payload) => {
      res.write(`event: summary\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }));
  };

  await sendSummary();

  const unsubscribe = subscribeTenantEvents(req.user.tenantId, () => {
    sendSummary().catch(() => {});
  });

  const keepAlive = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
};
