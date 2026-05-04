import { Router } from "express";
import {
  categoryValidation,
  createCategory,
  createMenuItem,
  deleteMenuItem,
  deleteCategory,
  exportMenuItems,
  getCategories,
  getMenu,
  importMenuItems,
  importMenuValidation,
  menuValidation,
  ownerPinValidation,
  updateCategory,
  updateMenuItem,
  updateMenuValidation
} from "../controllers/menuController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/categories", protect, getCategories);
router.post("/categories", protect, categoryValidation, validate, createCategory);
router.patch("/categories/:id", protect, categoryValidation, validate, updateCategory);
router.delete("/categories/:id", protect, ownerPinValidation, validate, deleteCategory);
router.post("/import", protect, importMenuValidation, validate, importMenuItems);
router.get("/export", protect, exportMenuItems);
router.get("/", protect, getMenu);
router.post("/", protect, menuValidation, validate, createMenuItem);
router.patch("/:id", protect, updateMenuValidation, validate, updateMenuItem);
router.delete("/:id", protect, updateMenuValidation, validate, deleteMenuItem);

export default router;
