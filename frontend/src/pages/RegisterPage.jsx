import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to register");
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
            <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
            <p className="mt-2 text-sm text-slate-400">Phase 1 supports up to 2 registered users.</p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span className="text-slate-300">Name</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/50"
                placeholder="Your Name"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span className="text-slate-300">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span className="text-slate-300">Password</span>
              <input
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/50"
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
            className="w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-rose-400 transition-colors hover:text-rose-300">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
