import { AuditLog } from "../models/AuditLog.js";
import { Expense } from "../models/Expense.js";
import { Order } from "../models/Order.js";
import { endOfDay, startOfDay } from "../utils/date.js";

export const buildDailyReport = async ({ tenantId, date = new Date() }) => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const [orders, expenses, recentAudits] = await Promise.all([
    Order.find({ tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } }),
    Expense.find({ tenantId, spentOn: { $gte: dayStart, $lte: dayEnd } }),
    AuditLog.find({ tenantId, createdAt: { $gte: dayStart, $lte: dayEnd } }).sort({ createdAt: -1 }).limit(50)
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const grossProfit = orders.reduce((sum, order) => sum + (order.grossProfit || 0), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netEstimate = grossProfit - expenseTotal;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const discountedOrders = orders.filter((order) => Number(order.discount || 0) > 0).length;

  const topItemsMap = {};
  const combosMap = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      topItemsMap[item.name] = (topItemsMap[item.name] || 0) + item.quantity;
    });

    const uniqueNames = [...new Set(order.items.map((item) => item.menuItemName || item.name))].sort();
    for (let left = 0; left < uniqueNames.length; left += 1) {
      for (let right = left + 1; right < uniqueNames.length; right += 1) {
        const key = `${uniqueNames[left]} + ${uniqueNames[right]}`;
        combosMap[key] = (combosMap[key] || 0) + 1;
      }
    }
  });

  const topItems = Object.entries(topItemsMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  const topCombos = Object.entries(combosMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const suspiciousCount = recentAudits.filter((audit) => audit.action === "cancel" || audit.meta?.discount > 0).length;

  const lines = [
    `Tracky Daily Summary - ${dayStart.toLocaleDateString("en-IN")}`,
    `Revenue: Rs ${Math.round(revenue)}`,
    `Gross Profit: Rs ${Math.round(grossProfit)}`,
    `Expenses: Rs ${Math.round(expenseTotal)}`,
    `Net Estimate: Rs ${Math.round(netEstimate)}`,
    `Orders: ${orders.length}`,
    `Cancelled: ${cancelled}`,
    `Discounted Bills: ${discountedOrders}`,
    `Top Items: ${topItems.map((item) => `${item.name} x${item.quantity}`).join(", ") || "No sales yet"}`,
    `Top Combos: ${topCombos.map((combo) => `${combo.label} (${combo.count})`).join(", ") || "No combo pattern yet"}`,
    netEstimate < revenue * 0.2 ? "Insight: Margin is under pressure. Audit discounts and food cost." : "Insight: Profit quality is stable today.",
    suspiciousCount > 3 ? "Action: Review staff exception activity before shift close." : "Action: Push top 3 fast-moving dishes during dinner rush."
  ];

  return {
    date: dayStart.toISOString().slice(0, 10),
    revenue,
    grossProfit,
    expenseTotal,
    netEstimate,
    ordersCount: orders.length,
    cancelled,
    discountedOrders,
    topItems,
    topCombos,
    suspiciousCount,
    text: lines.join("\n")
  };
};
