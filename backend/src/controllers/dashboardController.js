import { Expense } from "../models/Expense.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import { MenuItem } from "../models/MenuItem.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { endOfDay, startOfDay } from "../utils/date.js";

const toPercent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

export const getSummary = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const lastThirtyMinutes = new Date(Date.now() - 30 * 60 * 1000);
  const riskWindowStart = new Date(dayStart);
  riskWindowStart.setDate(riskWindowStart.getDate() - 6);

  const [todayOrders, todayExpenses, lowStockItems, recentOrders, recentAudits, menuItems] = await Promise.all([
    Order.find({ tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
    Expense.find({ tenantId, spentOn: { $gte: dayStart, $lte: dayEnd } }),
    InventoryItem.find({ tenantId, $expr: { $lte: ["$currentStock", "$reorderLevel"] } }).limit(5),
    Order.find({ tenantId, createdAt: { $gte: weekStart } }),
    AuditLog.find({ tenantId, createdAt: { $gte: riskWindowStart } }).sort({ createdAt: -1 }).limit(150),
    MenuItem.find({ tenantId, isArchived: { $ne: true } })
  ]);

  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const estimatedFoodCost = todayOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.estimatedCost, 0),
    0
  );
  const todayExpenseTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = todayOrders.reduce((sum, order) => sum + (order.grossProfit || 0), 0);
  const estimatedProfit = grossProfit - todayExpenseTotal;

  const salesByItem = {};
  const comboMap = {};
  recentOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (!salesByItem[item.name]) {
        salesByItem[item.name] = { quantity: 0, revenue: 0, profit: 0 };
      }
      salesByItem[item.name].quantity += item.quantity;
      salesByItem[item.name].revenue += item.lineTotal || 0;
      salesByItem[item.name].profit += item.lineProfit || 0;
    });

    const uniqueItems = [...new Map(order.items.map((item) => [String(item.menuItemId), item])).values()].sort((left, right) =>
      String(left.menuItemId).localeCompare(String(right.menuItemId))
    );

    for (let left = 0; left < uniqueItems.length; left += 1) {
      for (let right = left + 1; right < uniqueItems.length; right += 1) {
        const first = uniqueItems[left];
        const second = uniqueItems[right];
        const key = `${first.menuItemId}::${second.menuItemId}`;
        if (!comboMap[key]) {
          comboMap[key] = {
            leftItemId: first.menuItemId,
            leftName: first.menuItemName || first.name,
            rightItemId: second.menuItemId,
            rightName: second.menuItemName || second.name,
            count: 0
          };
        }
        comboMap[key].count += 1;
      }
    }
  });

  const topItems = Object.entries(salesByItem)
    .map(([name, metrics]) => ({ name, ...metrics }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const highMarginDishes = Object.entries(salesByItem)
    .map(([name, metrics]) => ({
      name,
      marginPercent: toPercent(metrics.profit, metrics.revenue),
      profit: metrics.profit,
      quantity: metrics.quantity
    }))
    .filter((item) => item.quantity > 0)
    .sort((a, b) => b.marginPercent - a.marginPercent || b.profit - a.profit)
    .slice(0, 5);

  const comboSuggestions = Object.values(comboMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const dailyTrendMap = {};
  recentOrders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    dailyTrendMap[key] = (dailyTrendMap[key] || 0) + order.total;
  });

  const paymentBreakdown = todayOrders.reduce((acc, order) => {
    (order.payments || []).forEach((payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
    });
    return acc;
  }, {});

  const alerts = [];
  if (todayOrders.length === 0) alerts.push("No billing synced yet today");
  if (lowStockItems.length) alerts.push(`${lowStockItems[0].name} is low on stock`);
  if (estimatedProfit < todayRevenue * 0.15 && todayRevenue > 0) {
    alerts.push("Profit looks thin today. Check raw material cost and discounts.");
  }

  const activeOrdersInLastThirtyMinutes = todayOrders.filter((order) => new Date(order.createdAt) >= lastThirtyMinutes);
  const ordersPerHour = activeOrdersInLastThirtyMinutes.length * 2;
  const rushModeActive = ordersPerHour >= 20;
  if (rushModeActive) {
    alerts.push("Rush Mode should be active now. Keep only top movers visible.");
  }

  const availableMenuCount = menuItems.filter((item) => item.isAvailable).length;
  const hiddenLowDemandItems = menuItems.filter((item) => item.rushVisible === false).length;

  const staffRiskMap = {};
  recentAudits.forEach((audit) => {
    const key = String(audit.actorUserId || "unknown");
    if (!staffRiskMap[key]) {
      staffRiskMap[key] = {
        actorUserId: audit.actorUserId,
        name: "Unknown",
        edits: 0,
        cancels: 0,
        discounts: 0,
        approvals: 0,
        riskScore: 0
      };
    }
    const current = staffRiskMap[key];
    current.name = audit.meta?.actorName || current.name;
    if (audit.action === "edit") {
      current.edits += 1;
      current.riskScore += 2;
    }
    if (audit.action === "cancel") {
      current.cancels += 1;
      current.riskScore += 4;
    }
    if (audit.meta?.discount > 0) {
      current.discounts += 1;
      current.riskScore += audit.meta.discount >= 100 ? 5 : 2;
    }
    if (audit.ownerApprovedBy) {
      current.approvals += 1;
    }
  });

  const staffRiskSummary = Object.values(staffRiskMap)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  const suspiciousActivities = recentAudits
    .filter((audit) => audit.action === "cancel" || audit.action === "edit" || audit.meta?.discount > 0)
    .slice(0, 8)
    .map((audit) => ({
      id: audit._id,
      action: audit.action,
      at: audit.createdAt,
      orderNumber: audit.meta?.orderNumber || "N/A",
      discount: audit.meta?.discount || 0,
      riskFlags: audit.meta?.riskFlags || []
    }));

  res.json({
    todayRevenue,
    estimatedProfit,
    grossProfit,
    ordersCount: todayOrders.length,
    foodCost: estimatedFoodCost,
    expenseTotal: todayExpenseTotal,
    lowStockItems,
    topItems,
    highMarginDishes,
    comboSuggestions,
    paymentBreakdown,
    alerts,
    weeklyTrend: Object.entries(dailyTrendMap).map(([date, revenue]) => ({ date, revenue })),
    rushMode: {
      active: rushModeActive,
      ordersPerHour,
      visibleMenuCount: availableMenuCount,
      hiddenLowDemandItems
    },
    staffRiskSummary,
    suspiciousActivities
  });
});
