import { Router } from "express";
import { createExpense, expenseValidation, getExpenses } from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, getExpenses);
router.post("/", protect, expenseValidation, validate, createExpense);

export default router;
