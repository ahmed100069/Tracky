export const buildFallbackInsights = ({ revenue, estimatedProfit, lowStockItems, topItems }) => {
  const insights = [];

  if (revenue <= 0) {
    insights.push("Aaj sale record nahi hui. Billing screen se pehla order pakdo.");
  } else if (estimatedProfit < revenue * 0.18) {
    insights.push("Profit margin low lag rahi hai. Raw material cost aur extra kharch check karo.");
  } else {
    insights.push("Aaj ka din theek chal raha hai. Fast-moving items ko front row par rakho.");
  }

  if (topItems?.length) {
    insights.push(`${topItems[0].name} aaj ka top item hai. Isse stock aur prep ready rakho.`);
  }

  if (lowStockItems?.length) {
    insights.push(`${lowStockItems[0].name} low stock mein hai. Jaldi refill plan karo.`);
  }

  return insights;
};
