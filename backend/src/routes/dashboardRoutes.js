import { Router } from "express";
import { getSummary } from "../controllers/dashboardController.js";
import { streamDashboard } from "../controllers/dashboardStreamController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/summary", protect, getSummary);
router.get("/stream", streamDashboard);

export default router;
