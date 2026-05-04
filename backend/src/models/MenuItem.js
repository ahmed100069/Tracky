import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem"
    },
    name: String,
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: "unit" },
    cost: { type: Number, default: 0 }
  },
  { _id: false }
);

const portionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false }
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    name: { type: String, required: true },
    aliases: [{ type: String, trim: true }],
    category: { type: String, default: "Main" },
    price: { type: Number, required: true },
    portions: [portionSchema],
    isAvailable: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
    rushVisible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
    dayparts: [{ type: String, enum: ["morning", "lunch", "night"] }],
    preparationCost: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    ingredients: [ingredientSchema]
  },
  { timestamps: true }
);

menuItemSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
