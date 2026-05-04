import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../components/MetricCard.jsx";
import { QuickActionCard } from "../components/QuickActionCard.jsx";
import { useAppStore } from "../store/appStore.js";
import { buildDashboardStreamUrl } from "../lib/api.js";
import { formatCurrency } from "../utils/currency.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const { dashboard, aiInsights, udharAlerts, loadBootstrap, syncOfflineOrders, offlineQueue } = useAppStore();

  useEffect(() => {
    loadBootstrap().catch(() => {});
  }, [loadBootstrap]);

  useEffect(() => {
    const source = new EventSource(buildDashboardStreamUrl());
    source.addEventListener("summary", (event) => {
      try {
        const payload = JSON.parse(event.data);
        useAppStore.setState({ dashboard: payload });
      } catch {
        // Ignore malformed stream data.
      }
    });
    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, []);

  if (!dashboard) {
    return <div className="glass-card p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="glass-card overflow-hidden p-5">
        <p className="section-title">Owner View</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl text-brand-100">Aaj ka haal seedha samjho</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-200/75">
              Revenue, profit, low stock aur udhar sab ek clean screen par. No clutter, no training.
            </p>
          </div>
          {offlineQueue.length ? (
            <button className="pill-button" onClick={() => syncOfflineOrders().catch(() => {})}>
              Sync {offlineQueue.length} offline order(s)
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Today's Revenue" value={formatCurrency(dashboard.todayRevenue)} hint="Live order total" />
        <MetricCard label="Approx Profit" value={formatCurrency(dashboard.estimatedProfit)} hint="Approx: revenue - food cost - expenses" />
        <MetricCard label="Orders Count" value={dashboard.ordersCount} hint="Completed orders today" />
        <MetricCard label="Food Cost" value={formatCurrency(dashboard.foodCost)} hint="Raw material estimate" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={`glass-card p-4 ${dashboard.rushMode?.active ? "border border-orange-500/40" : ""}`}>
          <p className="section-title">Rush Mode</p>
          <h3 className="mt-2 text-xl font-semibold text-brand-100">{dashboard.rushMode?.active ? "Active" : "Standby"}</h3>
          <p className="mt-2 text-sm text-brand-200/75">
            Pace: {dashboard.rushMode?.ordersPerHour || 0} orders/hour
          </p>
          <p className="mt-1 text-sm text-brand-200/75">
            Hidden low-demand items: {dashboard.rushMode?.hiddenLowDemandItems || 0}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="section-title">High Margin Dishes</p>
          <div className="mt-3 space-y-2 text-sm text-brand-100">
            {(dashboard.highMarginDishes || []).map((item) => (
              <div key={item.name} className="rounded-2xl bg-brand-800/70 p-3">
                {item.name} • {item.marginPercent}% margin • {formatCurrency(item.profit)}
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="section-title">Staff Risk</p>
          <div className="mt-3 space-y-2 text-sm text-brand-100">
            {(dashboard.staffRiskSummary || []).length ? (
              dashboard.staffRiskSummary.map((item, index) => (
                <div key={`${item.actorUserId || "unknown"}-${index}`} className="rounded-2xl bg-brand-800/70 p-3">
                  Risk {item.riskScore} • edits {item.edits} • cancels {item.cancels} • discounts {item.discounts}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-brand-800/70 p-3">No risky activity patterns detected.</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-4">
          <p className="section-title">Smart Alerts</p>
          <div className="mt-4 space-y-3">
            {(dashboard.alerts || []).map((alert) => (
              <div key={alert} className="rounded-2xl border border-brand-500/30 bg-brand-800/70 p-3 text-sm text-brand-100">
                {alert}
              </div>
            ))}
            {aiInsights.map((insight) => (
              <div key={insight} className="rounded-2xl bg-brand-800/70 p-3 text-sm text-brand-100">
                {insight}
              </div>
            ))}
            {udharAlerts.map((alert) => (
              <div key={alert} className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-100">
                {alert}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <QuickActionCard title="Top Items" subtitle={dashboard.topItems.map((item) => `${item.name} x${item.quantity}`).join(", ") || "No order data yet"} actionLabel="Open Billing" onClick={() => navigate("/billing")} />
          <QuickActionCard title="Low Stock" subtitle={dashboard.lowStockItems.map((item) => item.name).join(", ") || "All good"} actionLabel="Open Inventory" onClick={() => navigate("/inventory")} />
          <QuickActionCard
            title="Payment Mix"
            subtitle={Object.entries(dashboard.paymentBreakdown || {}).map(([method, amount]) => `${method}: ${formatCurrency(amount)}`).join(", ") || "No payment data yet"}
            actionLabel="Open Billing"
            onClick={() => navigate("/billing")}
          />
        </div>
      </section>

      <section className="glass-card p-4">
        <p className="section-title">Suspicious Activity Feed</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(dashboard.suspiciousActivities || []).map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-100">
              {activity.action} • {activity.orderNumber} {activity.discount ? `• discount ${formatCurrency(activity.discount)}` : ""}
              <div className="mt-1 text-xs text-orange-100/80">{(activity.riskFlags || []).join(", ") || "review"}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
