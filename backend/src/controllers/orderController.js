import { body } from "express-validator";
import { AuditLog } from "../models/AuditLog.js";
import { Customer } from "../models/Customer.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Tenant } from "../models/Tenant.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { verifyOwnerPin } from "../utils/pin.js";
import { publishTenantEvent } from "../services/liveUpdates.js";

export const orderValidation = [
  body("clientOrderId").notEmpty().withMessage("Client order ID is required"),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("paymentMethod").optional().isIn(["cash", "upi", "card", "udhar", "split"]),
  body("payments").isArray({ min: 1 }).withMessage("At least one payment line is required"),
  body("discount").optional().isFloat({ min: 0 }).withMessage("Discount must be zero or more"),
  body("customerId").optional().isMongoId().withMessage("Invalid customer ID"),
  body("ownerPin").optional().isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

const buildOrderNumber = () => `TKY-${Date.now().toString().slice(-8)}`;

const normalizePayments = (payments = []) =>
  payments
    .map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount || 0)
    }))
    .filter((payment) => payment.amount > 0);

const validatePayments = ({ paymentMethod, payments, total, customerId }) => {
  const normalized = normalizePayments(payments);
  if (!normalized.length) {
    throw new ApiError(400, "Select at least one payment");
  }

  const paymentTotal = normalized.reduce((sum, payment) => sum + payment.amount, 0);
  if (Math.round(paymentTotal) !== Math.round(total)) {
    throw new ApiError(400, "Payment split does not match bill total");
  }

  const uniqueMethods = [...new Set(normalized.map((payment) => payment.method))];
  if (uniqueMethods.length > 1 && paymentMethod !== "split") {
    throw new ApiError(400, "Use split payment mode when using multiple methods");
  }

  if (normalized.some((payment) => payment.method === "udhar") && !customerId) {
    throw new ApiError(400, "Udhar requires a customer");
  }

  return normalized;
};

const writeAuditLog = async ({ tenantId, entityId, actorUserId, ownerApprovedBy, action, meta }) => {
  await AuditLog.create({
    tenantId,
    entityType: "order",
    entityId,
    action,
    actorUserId,
    ownerApprovedBy,
    meta
  });
};

const buildOrderItems = (items, menuMap) =>
  items.map((item) => {
    const menuItem = menuMap.get(String(item.menuItemId));
    if (!menuItem) {
      throw new ApiError(400, `Menu item not found: ${item.menuItemId}`);
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(item.unitPrice || menuItem.price);
    const lineName = String(item.name || "").trim() || menuItem.name;
    const portionLabel = String(item.portionLabel || "").trim();
    const estimatedCost = (menuItem.preparationCost || 0) * quantity;
    const lineTotal = unitPrice * quantity;
    return {
      menuItemId: menuItem._id,
      menuItemName: menuItem.name,
      name: lineName,
      portionLabel,
      quantity,
      unitPrice,
      lineTotal,
      estimatedCost,
      lineProfit: lineTotal - estimatedCost
    };
  });

const buildStaffRiskFlags = ({ discount, normalizedPayments, subtotal, req }) => {
  const flags = [];
  if (discount > 0) {
    flags.push("discount-used");
    if (subtotal > 0 && discount / subtotal >= 0.15) {
      flags.push("high-discount");
    }
  }
  if (normalizedPayments.some((payment) => payment.method === "udhar")) {
    flags.push("udhar-used");
  }
  if (req.user.role !== "owner" && flags.length) {
    flags.push("staff-sensitive-action");
  }
  return flags;
};

export const createOrder = asyncHandler(async (req, res) => {
  const {
    clientOrderId,
    items,
    paymentMethod = "cash",
    customerId,
    discount = 0,
    source = "manual",
    notes,
    payments,
    ownerPin,
    deviceId,
    localCreatedAt
  } = req.body;

  const existingOrder = await Order.findOne({
    tenantId: req.user.tenantId,
    clientOrderId
  });

  if (existingOrder) {
    return res.status(200).json(existingOrder);
  }

  const itemIds = items.map((item) => item.menuItemId);
  const menuItems = await MenuItem.find({
    tenantId: req.user.tenantId,
    _id: { $in: itemIds }
  });

  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));
  const orderItems = buildOrderItems(items, menuMap);

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const normalizedDiscount = Math.max(Number(discount || 0), 0);
  const total = Math.max(subtotal - normalizedDiscount, 0);
  const normalizedPayments = validatePayments({
    paymentMethod,
    payments,
    total,
    customerId
  });

  const requiresOwnerApproval =
    normalizedPayments.some((payment) => payment.method === "udhar") || normalizedDiscount > 0;
  let ownerApprovedBy = null;

  if (requiresOwnerApproval) {
    const tenant = await Tenant.findById(req.user.tenantId);
    await verifyOwnerPin({ tenant, pin: ownerPin });
    ownerApprovedBy = req.user._id;
  }

  const grossProfit = orderItems.reduce((sum, item) => sum + item.lineProfit, 0) - normalizedDiscount;
  const riskFlags = buildStaffRiskFlags({
    discount: normalizedDiscount,
    normalizedPayments,
    subtotal,
    req
  });

  const order = await Order.create({
    tenantId: req.user.tenantId,
    clientOrderId,
    orderNumber: buildOrderNumber(),
    deviceId,
    createdBy: req.user._id,
    items: orderItems,
    subtotal,
    discount: normalizedDiscount,
    total,
    grossProfit,
    payments: normalizedPayments,
    paymentMethod,
    customerId: customerId || undefined,
    source,
    notes,
    localCreatedAt,
    syncedAt: new Date(),
    approvals: {
      udharApprovedBy: normalizedPayments.some((payment) => payment.method === "udhar") ? ownerApprovedBy : undefined,
      discountApprovedBy: normalizedDiscount > 0 ? ownerApprovedBy : undefined
    }
  });

  for (const orderItem of orderItems) {
    const menuItem = menuMap.get(String(orderItem.menuItemId));
    for (const ingredient of menuItem.ingredients || []) {
      if (!ingredient.inventoryItemId) continue;
      await InventoryItem.findOneAndUpdate(
        { tenantId: req.user.tenantId, _id: ingredient.inventoryItemId },
        { $inc: { currentStock: -(ingredient.quantity * orderItem.quantity) } }
      );
    }
  }

  if (normalizedPayments.some((payment) => payment.method === "udhar") && customerId) {
    await Customer.findOneAndUpdate(
      { tenantId: req.user.tenantId, _id: customerId },
      {
        $inc: {
          outstandingAmount: normalizedPayments
            .filter((payment) => payment.method === "udhar")
            .reduce((sum, payment) => sum + payment.amount, 0)
        },
        $set: { lastCreditDate: new Date() }
      }
    );
  }

  await writeAuditLog({
    tenantId: req.user.tenantId,
    entityId: order._id,
    actorUserId: req.user._id,
    ownerApprovedBy,
    action: normalizedPayments.some((payment) => payment.method === "udhar") ? "udhar-approved" : "create",
    meta: {
      orderNumber: order.orderNumber,
      total,
      grossProfit,
      discount: normalizedDiscount,
      payments: normalizedPayments,
      riskFlags
    }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "order-created",
    payload: { orderId: order._id, orderNumber: order.orderNumber }
  });

  res.status(201).json(order);
});

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ tenantId: req.user.tenantId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("createdBy", "name role");

  res.json(orders);
});

export const updateOrderValidation = [
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("payments").isArray({ min: 1 }).withMessage("At least one payment line is required"),
  body("discount").optional().isFloat({ min: 0 }).withMessage("Discount must be zero or more"),
  body("ownerPin").isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits")
];

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  await verifyOwnerPin({ tenant, pin: req.body.ownerPin });

  const menuItems = await MenuItem.find({
    tenantId: req.user.tenantId,
    _id: { $in: req.body.items.map((item) => item.menuItemId) }
  });
  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));

  const nextItems = buildOrderItems(req.body.items, menuMap);

  const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const normalizedDiscount = Math.max(Number(req.body.discount || 0), 0);
  const total = Math.max(subtotal - normalizedDiscount, 0);
  const normalizedPayments = validatePayments({
    paymentMethod: req.body.paymentMethod,
    payments: req.body.payments,
    total,
    customerId: req.body.customerId
  });
  const grossProfit = nextItems.reduce((sum, item) => sum + item.lineProfit, 0) - normalizedDiscount;
  const riskFlags = buildStaffRiskFlags({
    discount: normalizedDiscount,
    normalizedPayments,
    subtotal,
    req
  });

  order.items = nextItems;
  order.subtotal = subtotal;
  order.discount = normalizedDiscount;
  order.total = total;
  order.grossProfit = grossProfit;
  order.paymentMethod = req.body.paymentMethod;
  order.payments = normalizedPayments;
  order.customerId = req.body.customerId || undefined;
  order.notes = req.body.notes || order.notes;
  order.lastEditedBy = req.user._id;
  order.editedAt = new Date();
  order.editCount += 1;
  order.revision += 1;
  order.approvals.postPrintEditApprovedBy = req.user._id;
  order.approvals.discountApprovedBy = normalizedDiscount > 0 ? req.user._id : order.approvals.discountApprovedBy;
  await order.save();

  await writeAuditLog({
    tenantId: req.user.tenantId,
    entityId: order._id,
    actorUserId: req.user._id,
    ownerApprovedBy: req.user._id,
    action: "edit",
    meta: {
      orderNumber: order.orderNumber,
      total: order.total,
      grossProfit,
      discount: normalizedDiscount,
      revision: order.revision,
      riskFlags
    }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "order-updated",
    payload: { orderId: order._id, orderNumber: order.orderNumber }
  });

  res.json(order);
});

export const cancelOrderValidation = [
  body("ownerPin").isLength({ min: 4, max: 8 }).withMessage("Owner PIN must be 4 to 8 digits"),
  body("reason").notEmpty().withMessage("Cancel reason is required")
];

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status === "cancelled") {
    return res.json(order);
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  await verifyOwnerPin({ tenant, pin: req.body.ownerPin });

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = req.user._id;
  order.approvals.cancelApprovedBy = req.user._id;
  order.notes = [order.notes, `Cancelled: ${req.body.reason}`].filter(Boolean).join(" | ");
  await order.save();

  await writeAuditLog({
    tenantId: req.user.tenantId,
    entityId: order._id,
    actorUserId: req.user._id,
    ownerApprovedBy: req.user._id,
    action: "cancel",
    meta: {
      orderNumber: order.orderNumber,
      reason: req.body.reason
    }
  });

  publishTenantEvent(req.user.tenantId, {
    type: "order-cancelled",
    payload: { orderId: order._id, orderNumber: order.orderNumber }
  });

  res.json(order);
});

export const getDayCloseSummary = asyncHandler(async (req, res) => {
  const start = new Date(req.query.date || Date.now());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    tenantId: req.user.tenantId,
    createdAt: { $gte: start, $lte: end }
  }).populate("createdBy", "name");

  const completedOrders = orders.filter((order) => order.status === "completed");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");

  const paymentBreakdown = completedOrders.reduce((acc, order) => {
    (order.payments || []).forEach((payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
    });
    return acc;
  }, {});

  const staffSummary = completedOrders.reduce((acc, order) => {
    const staffName = order.createdBy?.name || "Unknown";
    if (!acc[staffName]) {
      acc[staffName] = { staffName, ordersCount: 0, totalSales: 0 };
    }
    acc[staffName].ordersCount += 1;
    acc[staffName].totalSales += order.total;
    return acc;
  }, {});

  res.json({
    date: start.toISOString().slice(0, 10),
    totalSales: completedOrders.reduce((sum, order) => sum + order.total, 0),
    ordersCount: completedOrders.length,
    paymentBreakdown,
    editedBills: completedOrders
      .filter((order) => order.editCount > 0)
      .map((order) => ({
        orderNumber: order.orderNumber,
        revision: order.revision,
        editedAt: order.editedAt
      })),
    cancelledBills: cancelledOrders.map((order) => ({
      orderNumber: order.orderNumber,
      cancelledAt: order.cancelledAt,
      notes: order.notes
    })),
    staffWise: Object.values(staffSummary)
  });
});
