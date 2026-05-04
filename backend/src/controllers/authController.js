import { body } from "express-validator";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

import { hashPin } from "../utils/pin.js";

export const signupValidation = [
  body("ownerName").notEmpty().withMessage("Owner name is required"),
  body("dhabaName").notEmpty().withMessage("Dhaba name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("ownerPin").isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required")
];

export const signup = asyncHandler(async (req, res) => {
  const { ownerName, dhabaName, email, password, phone, city, ownerPin } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const tenant = await Tenant.create({
    name: dhabaName,
    phone,
    city,
    ownerPinHash: await hashPin(ownerPin)
  });

  const user = await User.create({
    tenantId: tenant._id,
    name: ownerName,
    email,
    password,
    role: "owner"
  });

  res.status(201).json({
    token: signToken(user),
    user: {
      id: user._id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      dhabaName: tenant.name
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tenant = await Tenant.findById(user.tenantId);

  res.json({
    token: signToken(user),
    user: {
      id: user._id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      dhabaName: tenant?.name || "Tracky"
    }
  });
});
