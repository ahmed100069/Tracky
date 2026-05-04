import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard.jsx";
import { useAuthStore } from "../store/authStore.js";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <AuthCard title="Welcome back" subtitle="Billing, udhar aur daily profit ek hi jagah.">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            type="password"
            className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error ? <p className="text-sm text-orange-300">{error}</p> : null}
          <button className="w-full rounded-2xl bg-brand-400 px-4 py-3 font-bold text-brand-950" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="mt-4 text-sm text-brand-200/75">
          New dhaba? <Link to="/signup" className="text-brand-300">Create account</Link>
        </p>
      </AuthCard>
    </div>
  );
}
