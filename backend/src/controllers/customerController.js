import { body } from "express-validator";
import { Customer } from "../models/Customer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

export const customerValidation = [
  body("name").notEmpty().withMessage("Customer name is required")
];

export const paymentValidation = [
  body("amount").isFloat({ gt: 0 }).withMessage("Payment amount must be greater than zero")
];

export const getCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ tenantId: req.user.tenantId }).sort({
    outstandingAmount: -1,
    updatedAt: -1
  });

  const enriched = customers.map((customer) => {
    const overdueDays = customer.lastCreditDate
      ? Math.floor((Date.now() - new Date(customer.lastCreditDate).getTime()) / 86400000)
      : 0;
    return {
      ...customer.toObject(),
      overdueDays
    };
  });

  res.json(enriched);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({
    ...req.body,
    tenantId: req.user.tenantId
  });

  res.status(201).json(customer);
});

export const recordPayment = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  customer.outstandingAmount = Math.max(customer.outstandingAmount - Number(req.body.amount), 0);
  await customer.save();

  res.json(customer);
});
