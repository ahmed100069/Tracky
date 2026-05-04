import { body } from "express-validator";
import { InventoryItem } from "../models/InventoryItem.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const inventoryValidation = [
  body("name").notEmpty().withMessage("Inventory item name is required")
];

export const getInventory = asyncHandler(async (req, res) => {
  const inventory = await InventoryItem.find({ tenantId: req.user.tenantId }).sort({ name: 1 });
  res.json(
    inventory.map((item) => ({
      ...item.toObject(),
      isLow: item.currentStock <= item.reorderLevel
    }))
  );
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.create({
    ...req.body,
    tenantId: req.user.tenantId
  });

  res.status(201).json(item);
});
