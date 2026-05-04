import { Router } from "express";
import { getInsights, parseOrderValidation, parseVoiceOrder } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/parse-order", protect, parseOrderValidation, validate, parseVoiceOrder);
router.get("/insights", protect, getInsights);

export default router;
