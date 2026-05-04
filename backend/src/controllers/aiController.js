import { body } from "express-validator";
import { Customer } from "../models/Customer.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { buildFallbackInsights } from "../services/insightService.js";
import { generateInsightsWithAi, parseVoiceOrderWithAi } from "../services/openaiService.js";
import { parseOrderFallback } from "../services/orderParser.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { endOfDay, startOfDay } from "../utils/date.js";

export const parseOrderValidation = [
  body("transcript").notEmpty().withMessage("Transcript is required")
];

export const parseVoiceOrder = asyncHandler(async (req, res) => {
  const menuItems = await MenuItem.find({
    tenantId: req.user.tenantId,
    isAvailable: true
  });

  let parsed = null;

  try {
    parsed = await parseVoiceOrderWithAi({
      transcript: req.body.transcript,
      menuItems
    });
  } catch (_error) {
    parsed = null;
  }

  if (!parsed) {
    parsed = parseOrderFallback(req.body.transcript, menuItems);
  }

  const normalizedItems = (parsed.items || [])
    .map((item) => {
      const match = menuItems.find(
        (menuItem) =>
          String(menuItem._id) === String(item.menuItemId) ||
          menuItem.name.toLowerCase() === String(item.name || "").toLowerCase()
      );
      if (!match) return null;
      return {
        menuItemId: match._id,
        name: match.name,
        quantity: Number(item.quantity) || 1,
        price: match.price
      };
    })
    .filter(Boolean);

  res.json({
    transcript: req.body.transcript,
    items: normalizedItems,
    notes: parsed.notes || ""
  });
});

export const getInsights = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [orders, customers, lowStockItems] = await Promise.all([
    Order.find({ tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
    Customer.find({ tenantId, outstandingAmount: { $gt: 0 } }).sort({ outstandingAmount: -1 }).limit(5),
    InventoryItem.find({ tenantId, $expr: { $lte: ["$currentStock", "$reorderLevel"] } }).limit(5)
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const estimatedCost = orders.reduce(
    (sum, order) => sum + order.items.reduce((innerSum, item) => innerSum + item.estimatedCost, 0),
    0
  );
  const estimatedProfit = revenue - estimatedCost;
  const topItems = orders
    .flatMap((order) => order.items)
    .reduce((map, item) => {
      map[item.name] = (map[item.name] || 0) + item.quantity;
      return map;
    }, {});

  const topItemsList = Object.entries(topItems)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  const prompt = [
    `Today's revenue: Rs ${revenue}`,
    `Estimated profit: Rs ${estimatedProfit}`,
    `Top items: ${topItemsList.map((item) => `${item.name} (${item.quantity})`).join(", ") || "none"}`,
    `Low stock: ${lowStockItems.map((item) => item.name).join(", ") || "none"}`,
    `Udhar pending: ${customers.map((item) => `${item.name} Rs ${item.outstandingAmount}`).join(", ") || "none"}`
  ].join("\n");

  let text = null;
  try {
    text = await generateInsightsWithAi(prompt);
  } catch (_error) {
    text = null;
  }

  const fallbackInsights = buildFallbackInsights({
    revenue,
    estimatedProfit,
    lowStockItems,
    topItems: topItemsList
  });

  const udharAlerts = customers.map((customer) => {
    const overdueDays = customer.lastCreditDate
      ? Math.floor((Date.now() - new Date(customer.lastCreditDate).getTime()) / 86400000)
      : 0;
    return `Rs ${customer.outstandingAmount} pending from ${customer.name} for ${overdueDays} day(s)`;
  });

  res.json({
    insights: text ? text.split("\n").filter(Boolean) : fallbackInsights,
    udharAlerts
  });
});
