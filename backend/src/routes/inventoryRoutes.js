import { Router } from "express";
import {
  createInventoryItem,
  getInventory,
  inventoryValidation
} from "../controllers/inventoryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", protect, getInventory);
router.post("/", protect, inventoryValidation, validate, createInventoryItem);

export default router;
