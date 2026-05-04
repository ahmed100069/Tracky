import { Router } from "express";
import {
  cancelOrder,
  cancelOrderValidation,
  createOrder,
  getDayCloseSummary,
  getOrders,
  orderValidation,
  updateOrder,
  updateOrderValidation
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimitMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, rateLimit({ windowMs: 60000, max: 180 }), getOrders);
router.get("/day-close", protect, rateLimit({ windowMs: 60000, max: 60 }), getDayCloseSummary);
router.post("/", protect, rateLimit({ windowMs: 60000, max: 240 }), orderValidation, validate, createOrder);
router.patch("/:id", protect, rateLimit({ windowMs: 60000, max: 120 }), updateOrderValidation, validate, updateOrder);
router.post("/:id/cancel", protect, rateLimit({ windowMs: 60000, max: 120 }), cancelOrderValidation, validate, cancelOrder);

export default router;
