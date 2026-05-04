import { Router } from "express";
import {
  getBootstrapSettings,
  reportingSettingsValidation,
  updateReportingSettings
} from "../controllers/settingsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/bootstrap", protect, getBootstrapSettings);
router.patch("/reporting", protect, reportingSettingsValidation, validate, updateReportingSettings);

export default router;
