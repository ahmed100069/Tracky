import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard.jsx";
import { useAuthStore } from "../store/authStore.js";

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    ownerName: "",
    dhabaName: "",
    phone: "",
    city: "",
    email: "",
    password: "",
    ownerPin: ""
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <AuthCard title="Start in 5 minutes" subtitle="Simple setup for local restaurants and dhabas.">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {["ownerName", "dhabaName", "phone", "city", "email", "password", "ownerPin"].map((field) => (
            <input
              key={field}
              type={field === "password" || field === "ownerPin" ? "password" : "text"}
              className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              placeholder={field.replace(/([A-Z])/g, " $1")}
              value={form[field]}
              onChange={(event) => setForm({ ...form, [field]: event.target.value })}
            />
          ))}
          {error ? <p className="text-sm text-orange-300">{error}</p> : null}
          <button className="w-full rounded-2xl bg-brand-400 px-4 py-3 font-bold text-brand-950" disabled={loading}>
            {loading ? "Creating..." : "Create Dhaba Workspace"}
          </button>
        </form>
        <p className="mt-4 text-sm text-brand-200/75">
          Already registered? <Link to="/login" className="text-brand-300">Login</Link>
        </p>
      </AuthCard>
    </div>
  );
}
