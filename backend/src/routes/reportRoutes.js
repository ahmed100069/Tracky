import { Router } from "express";
import {
  getWhatsappDailyReport,
  sendWhatsappDailyReport,
  sendWhatsappDailyReportValidation
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/whatsapp/daily", protect, getWhatsappDailyReport);
router.post("/whatsapp/daily/send", protect, sendWhatsappDailyReportValidation, validate, sendWhatsappDailyReport);

export default router;
