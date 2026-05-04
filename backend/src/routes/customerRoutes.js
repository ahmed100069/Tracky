import { Router } from "express";
import {
  createCustomer,
  customerValidation,
  getCustomers,
  paymentValidation,
  recordPayment
} from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, getCustomers);
router.post("/", protect, customerValidation, validate, createCustomer);
router.post("/:id/payment", protect, paymentValidation, validate, recordPayment);

export default router;
