import bcrypt from "bcryptjs";
import { ApiError } from "./apiError.js";

export const hashPin = async (pin) => bcrypt.hash(String(pin), 10);

export const verifyOwnerPin = async ({ tenant, pin }) => {
  if (!tenant?.ownerPinHash) {
    throw new ApiError(400, "Owner PIN is not configured");
  }

  const isValid = await bcrypt.compare(String(pin || ""), tenant.ownerPinHash);
  if (!isValid) {
    throw new ApiError(403, "Owner PIN is invalid");
  }
};
