import { body } from "express-validator";
import { Expense } from "../models/Expense.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const expenseValidation = [
  body("title").notEmpty().withMessage("Expense title is required"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than zero")
];

export const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ tenantId: req.user.tenantId })
    .sort({ spentOn: -1 })
    .limit(100);
  res.json(expenses);
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    tenantId: req.user.tenantId
  });

  res.status(201).json(expense);
});
