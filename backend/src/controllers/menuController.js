import { body } from "express-validator";
import { Tenant } from "../models/Tenant.js";
import { verifyOwnerPin } from "../utils/pin.js";
import { MenuItem } from "../models/MenuItem.js";
import { Category } from "../models/Category.js";
import { AuditLog } from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { parseCsv, toCsv } from "../utils/csv.js";
import { publishTenantEvent } from "../services/liveUpdates.js";

const normalizeName = (value) => String(value || "").trim();
const normalizeCategoryName = (value) => normalizeName(value) || "Main";
const normalizeAliases = (aliases = []) =>
  (Array.isArray(aliases) ? aliases : String(aliases || "").split(","))
    .map((alias) => normalizeName(alias))
    .filter(Boolean);
const normalizeDayparts = (dayparts = []) =>
  (Array.isArray(dayparts) ? dayparts : String(dayparts || "").split(","))
    .map((daypart) => normalizeName(daypart).toLowerCase())
    .filter((daypart) => ["morning", "lunch", "night"].includes(daypart));

const normalizePortions = (portions = [], fallbackPrice = 0) => {
  const cleaned = (Array.isArray(portions) ? portions : [])
    .map((portion) => ({
      label: String(portion.label || "").trim(),
      price: Number(portion.price || 0),
      isDefault: Boolean(portion.isDefault)
    }))
    .filter((portion) => portion.label && portion.price > 0);

  if (!cleaned.length && fallbackPrice > 0) {
    return [{ label: "Full", price: fallbackPrice, isDefault: true }];
  }

  const hasDefault = cleaned.some((portion) => portion.isDefault);
  if (!hasDefault && cleaned.length) {
    cleaned[0].isDefault = true;
  }
  return cleaned;
};

const writeAudit = async ({ req, entityType, entityId, action, meta = {} }) => {
  try {
    await AuditLog.create({
      tenantId: req.user.tenantId,
      entityType,
      entityId,
      action,
      actorUserId: req.user._id,
      meta
    });
  } catch {
    // Audit logging should not block the primary workflow.
  }
};

const requireOwnerApproval = async (req) => {
  if (req.user.role === "owner") return;
  const tenant = await Tenant.findById(req.user.tenantId);
  await verifyOwnerPin({ tenant, pin: req.body.ownerPin });
};

const ensureCategoryExists = async (tenantId, categoryName) => {
  const normalizedName = normalizeCategoryName(categoryName);
  const existing = await Category.findOne({
    tenantId,
    name: normalizedName
  });

  if (existing) {
    return existing;
  }

  return Category.create({
    tenantId,
    name: normalizedName
  });
};

const serializeMenuQuery = (tenantId, scope) => {
  if (scope === "manage") {
    return { tenantId, isArchived: { $ne: true } };
  }

  return {
    tenantId,
    isAvailable: true,
    isArchived: { $ne: true }
  };
};

const normalizeMenuPayload = (body) => {
  const price = Number(body.price || 0);
  return {
    name: normalizeName(body.name),
    category: normalizeCategoryName(body.category),
    price,
    aliases: normalizeAliases(body.aliases),
    portions: normalizePortions(body.portions, price),
    popular: Boolean(body.popular),
    isAvailable: typeof body.isAvailable === "undefined" ? true : Boolean(body.isAvailable),
    rushVisible: typeof body.rushVisible === "undefined" ? true : Boolean(body.rushVisible),
    sortOrder: Number(body.sortOrder || 100),
    dayparts: normalizeDayparts(body.dayparts),
    preparationCost: Number(body.preparationCost || 0)
  };
};

export const menuValidation = [
  body("name").notEmpty().withMessage("Item name is required"),
  body("category").optional().isString().withMessage("Category must be text"),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than zero"),
  body("aliases").optional().isArray().withMessage("Aliases must be an array"),
  body("portions").optional().isArray().withMessage("Portions must be an array"),
  body("dayparts").optional().isArray().withMessage("Dayparts must be an array"),
  body("baseUpdatedAt").optional().isISO8601().withMessage("Base updated at must be a valid date"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const updateMenuValidation = [
  body("name").optional().notEmpty().withMessage("Item name cannot be empty"),
  body("category").optional().isString().withMessage("Category must be text"),
  body("price").optional().isFloat({ gt: 0 }).withMessage("Price must be greater than zero"),
  body("aliases").optional().isArray().withMessage("Aliases must be an array"),
  body("portions").optional().isArray().withMessage("Portions must be an array"),
  body("dayparts").optional().isArray().withMessage("Dayparts must be an array"),
  body("baseUpdatedAt").optional().isISO8601().withMessage("Base updated at must be a valid date"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const categoryValidation = [
  body("name").notEmpty().withMessage("Category name is required"),
  body("sortOrder").optional().isInt().withMessage("Sort order must be a number"),
  body("rushPriority").optional().isInt().withMessage("Rush priority must be a number"),
  body("baseUpdatedAt").optional().isISO8601().withMessage("Base updated at must be a valid date"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const importMenuValidation = [
  body("csv").optional().isString().withMessage("CSV must be text"),
  body("rows").optional().isArray().withMessage("Rows must be an array"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const ownerPinValidation = [
  body("baseUpdatedAt").optional().isISO8601().withMessage("Base updated at must be a valid date"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

const assertNoConflict = (entity, baseUpdatedAt) => {
  if (!baseUpdatedAt) return;
  const serverTime = new Date(entity.updatedAt).getTime();
  const clientTime = new Date(baseUpdatedAt).getTime();
  if (Number.isNaN(clientTime)) return;
  if (serverTime > clientTime) {
    throw new ApiError(409, "This record changed on another device. Reload before saving again.");
  }
};

export const getMenu = asyncHandler(async (req, res) => {
  const items = await MenuItem.find(serializeMenuQuery(req.user.tenantId, req.query.scope)).sort({
    popular: -1,
    sortOrder: 1,
    category: 1,
    name: 1
  });

  res.json(items);
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ tenantId: req.user.tenantId }).sort({
    sortOrder: 1,
    name: 1
  });

  res.json(categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const name = normalizeCategoryName(req.body.name);
  const existing = await Category.findOne({
    tenantId: req.user.tenantId,
    name
  });
  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({
    tenantId: req.user.tenantId,
    name,
    sortOrder: Number(req.body.sortOrder || 100),
    rushPriority: Number(req.body.rushPriority || 0),
    isActive: typeof req.body.isActive === "undefined" ? true : Boolean(req.body.isActive)
  });

  await writeAudit({
    req,
    entityType: "category",
    entityId: category._id,
    action: "create",
    meta: { name: category.name }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "category-created",
    payload: { categoryId: category._id, name: category.name }
  });

  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const category = await Category.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  assertNoConflict(category, req.body.baseUpdatedAt);

  const previousName = category.name;
  const nextName = req.body.name ? normalizeCategoryName(req.body.name) : category.name;

  if (nextName.toLowerCase() !== previousName.toLowerCase()) {
    const existing = await Category.findOne({
      tenantId: req.user.tenantId,
      name: nextName,
      _id: { $ne: category._id }
    });
    if (existing) {
      throw new ApiError(409, "Category already exists");
    }
    category.name = nextName;
  }

  if (typeof req.body.sortOrder !== "undefined") {
    category.sortOrder = Number(req.body.sortOrder);
  }
  if (typeof req.body.rushPriority !== "undefined") {
    category.rushPriority = Number(req.body.rushPriority);
  }
  if (typeof req.body.isActive !== "undefined") {
    category.isActive = Boolean(req.body.isActive);
  }

  await category.save();

  if (category.name !== previousName) {
    await MenuItem.updateMany(
      {
        tenantId: req.user.tenantId,
        category: previousName,
        isArchived: { $ne: true }
      },
      { $set: { category: category.name } }
    );
  }

  await writeAudit({
    req,
    entityType: "category",
    entityId: category._id,
    action: "edit",
    meta: {
      previousName,
      nextName: category.name
    }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "category-updated",
    payload: { categoryId: category._id, name: category.name }
  });

  res.json(category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const category = await Category.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  assertNoConflict(category, req.body.baseUpdatedAt);

  const linkedItems = await MenuItem.countDocuments({
    tenantId: req.user.tenantId,
    category: category.name,
    isArchived: { $ne: true }
  });
  if (linkedItems > 0) {
    throw new ApiError(409, "Move or archive dishes in this category before deleting it");
  }

  await category.deleteOne();

  await writeAudit({
    req,
    entityType: "category",
    entityId: category._id,
    action: "delete",
    meta: { name: category.name }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "category-deleted",
    payload: { categoryId: category._id, name: category.name }
  });

  res.json({ ok: true, categoryId: category._id });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const payload = normalizeMenuPayload(req.body);
  const existing = await MenuItem.findOne({
    tenantId: req.user.tenantId,
    name: payload.name,
    isArchived: { $ne: true }
  });
  if (existing) {
    throw new ApiError(409, "Dish already exists in menu");
  }

  await ensureCategoryExists(req.user.tenantId, payload.category);

  const item = await MenuItem.create({
    ...payload,
    tenantId: req.user.tenantId
  });

  await writeAudit({
    req,
    entityType: "menu",
    entityId: item._id,
    action: "create",
    meta: { name: item.name, category: item.category }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "menu-created",
    payload: { itemId: item._id, name: item.name }
  });

  res.status(201).json(item);
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const item = await MenuItem.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId,
    isArchived: { $ne: true }
  });
  if (!item) {
    throw new ApiError(404, "Menu item not found");
  }
  assertNoConflict(item, req.body.baseUpdatedAt);

  const nextName = req.body.name ? normalizeName(req.body.name) : item.name;
  if (nextName.toLowerCase() !== item.name.toLowerCase()) {
    const existing = await MenuItem.findOne({
      tenantId: req.user.tenantId,
      name: nextName,
      _id: { $ne: item._id },
      isArchived: { $ne: true }
    });
    if (existing) {
      throw new ApiError(409, "Dish already exists in menu");
    }
    item.name = nextName;
  }

  if (typeof req.body.category !== "undefined") {
    item.category = normalizeCategoryName(req.body.category);
    await ensureCategoryExists(req.user.tenantId, item.category);
  }
  if (typeof req.body.price !== "undefined") {
    item.price = Number(req.body.price);
  }
  if (typeof req.body.aliases !== "undefined") {
    item.aliases = normalizeAliases(req.body.aliases);
  }
  if (typeof req.body.portions !== "undefined") {
    item.portions = normalizePortions(req.body.portions, Number(req.body.price || item.price));
  }
  if (typeof req.body.popular !== "undefined") {
    item.popular = Boolean(req.body.popular);
  }
  if (typeof req.body.isAvailable !== "undefined") {
    item.isAvailable = Boolean(req.body.isAvailable);
  }
  if (typeof req.body.rushVisible !== "undefined") {
    item.rushVisible = Boolean(req.body.rushVisible);
  }
  if (typeof req.body.sortOrder !== "undefined") {
    item.sortOrder = Number(req.body.sortOrder);
  }
  if (typeof req.body.dayparts !== "undefined") {
    item.dayparts = normalizeDayparts(req.body.dayparts);
  }
  if (typeof req.body.preparationCost !== "undefined") {
    item.preparationCost = Number(req.body.preparationCost);
  }

  await item.save();

  await writeAudit({
    req,
    entityType: "menu",
    entityId: item._id,
    action: "edit",
    meta: {
      name: item.name,
      category: item.category
    }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "menu-updated",
    payload: { itemId: item._id, name: item.name }
  });

  res.json(item);
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const item = await MenuItem.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId,
    isArchived: { $ne: true }
  });
  if (!item) {
    throw new ApiError(404, "Menu item not found");
  }
  assertNoConflict(item, req.body.baseUpdatedAt);

  item.isArchived = true;
  item.isAvailable = false;
  await item.save();

  await writeAudit({
    req,
    entityType: "menu",
    entityId: item._id,
    action: "delete",
    meta: { name: item.name, category: item.category }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "menu-deleted",
    payload: { itemId: item._id, name: item.name }
  });

  res.json({ ok: true, itemId: item._id });
});

const parseImportRows = (payload) => {
  if (Array.isArray(payload.rows) && payload.rows.length) {
    return payload.rows;
  }

  const csvRows = parseCsv(String(payload.csv || ""));
  if (!csvRows.length) {
    return [];
  }

  const [headers, ...records] = csvRows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [String(header || "").trim(), record[index] ?? ""]))
  );
};

export const importMenuItems = asyncHandler(async (req, res) => {
  await requireOwnerApproval(req);

  const rows = parseImportRows(req.body);
  if (!rows.length) {
    throw new ApiError(400, "No import rows provided");
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const payload = normalizeMenuPayload({
      name: row.name,
      category: row.category,
      price: row.price,
      aliases: String(row.aliases || "")
        .split("|")
        .map((alias) => alias.trim())
        .filter(Boolean),
      dayparts: String(row.dayparts || "")
        .split("|")
        .map((daypart) => daypart.trim())
        .filter(Boolean),
      popular: String(row.popular || "").toLowerCase() === "true",
      isAvailable: String(row.isAvailable || "true").toLowerCase() !== "false",
      rushVisible: String(row.rushVisible || "true").toLowerCase() !== "false",
      sortOrder: row.sortOrder,
      preparationCost: row.preparationCost,
      portions: [
        row.fullPrice ? { label: "Full", price: Number(row.fullPrice), isDefault: true } : null,
        row.halfPrice ? { label: "Half", price: Number(row.halfPrice) } : null
      ].filter(Boolean)
    });

    if (!payload.name || payload.price <= 0) {
      continue;
    }

    await ensureCategoryExists(req.user.tenantId, payload.category);

    const existing = await MenuItem.findOne({
      tenantId: req.user.tenantId,
      name: payload.name,
      isArchived: { $ne: true }
    });

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      updatedCount += 1;
      continue;
    }

    await MenuItem.create({
      ...payload,
      tenantId: req.user.tenantId
    });
    createdCount += 1;
  }

  await writeAudit({
    req,
    entityType: "menu",
    entityId: req.user._id,
    action: "import",
    meta: {
      createdCount,
      updatedCount,
      rows: rows.length
    }
  });

  res.json({
    ok: true,
    createdCount,
    updatedCount,
    totalRows: rows.length
  });
});

export const exportMenuItems = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({
    tenantId: req.user.tenantId,
    isArchived: { $ne: true }
  }).sort({ category: 1, name: 1 });

  const rows = [
    [
      "name",
      "category",
      "price",
      "fullPrice",
      "halfPrice",
      "aliases",
      "dayparts",
      "popular",
      "isAvailable",
      "rushVisible",
      "sortOrder",
      "preparationCost"
    ],
    ...items.map((item) => {
      const full = item.portions?.find((portion) => portion.label.toLowerCase() === "full");
      const half = item.portions?.find((portion) => portion.label.toLowerCase() === "half");
      return [
        item.name,
        item.category,
        item.price,
        full?.price ?? item.price,
        half?.price ?? "",
        (item.aliases || []).join("|"),
        (item.dayparts || []).join("|"),
        item.popular,
        item.isAvailable,
        item.rushVisible,
        item.sortOrder,
        item.preparationCost
      ];
    })
  ];

  await writeAudit({
    req,
    entityType: "menu",
    entityId: req.user._id,
    action: "export",
    meta: { count: items.length }
  });

  const csv = toCsv(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=tracky-menu-export.csv");
  res.send(csv);
});
