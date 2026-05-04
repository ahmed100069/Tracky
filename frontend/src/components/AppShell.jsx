import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, ReceiptText, Wallet, Boxes, Settings, UtensilsCrossed } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/billing", label: "Billing", icon: ReceiptText },
  { to: "/menu", label: "Menu Ops", icon: UtensilsCrossed },
  { to: "/udhar", label: "Udhar", icon: Wallet },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen px-3 py-3 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[220px_1fr]">
        <aside className="glass-card overflow-hidden">
          <div className="border-b border-brand-700/60 px-4 py-5">
            <p className="section-title">Tracky</p>
            <h1 className="mt-2 font-display text-2xl text-brand-100">{user?.dhabaName || "Dhaba"}</h1>
            <p className="mt-1 text-sm text-brand-200/80">
              {user?.name} • {user?.role}
            </p>
          </div>

          <nav className="grid gap-2 p-3 md:p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-brand-500 text-brand-950"
                        : "text-brand-100 hover:bg-brand-800/80"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 pt-0">
            <button className="pill-button w-full" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="min-h-[80vh]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
