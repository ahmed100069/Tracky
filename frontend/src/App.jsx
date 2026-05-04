import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";

const LoginPage = lazy(() => import("./pages/LoginPage.jsx").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx").then((module) => ({ default: module.SignupPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx").then((module) => ({ default: module.DashboardPage })));
const BillingPage = lazy(() => import("./pages/BillingPage.jsx").then((module) => ({ default: module.BillingPage })));
const MenuPage = lazy(() => import("./pages/MenuPage.jsx").then((module) => ({ default: module.MenuPage })));
const UdharPage = lazy(() => import("./pages/UdharPage.jsx").then((module) => ({ default: module.UdharPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage.jsx").then((module) => ({ default: module.InventoryPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx").then((module) => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <Suspense fallback={<div className="glass-card m-4 p-6 text-brand-100">Loading Tracky...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/udhar" element={<UdharPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
