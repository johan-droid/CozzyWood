import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <section className="w-full max-w-md">
        <form
          className="w-full space-y-6 rounded-2xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
          onSubmit={onSubmit}
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cozzywood Login</h1>
            <p className="mt-2 text-sm text-slate-400">Sign in to continue your watch room.</p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span className="text-slate-300">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span className="text-slate-300">Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/50"
                placeholder="••••••••"
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-slate-400">
            New here?{" "}
            <Link to="/register" className="font-medium text-amber-400 transition-colors hover:text-amber-300">
              Create account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
