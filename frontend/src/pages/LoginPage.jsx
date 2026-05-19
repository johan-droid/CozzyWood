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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
        <form className="w-full space-y-5 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-7 shadow-xl backdrop-blur" onSubmit={onSubmit}>
          <div>
            <h1 className="text-2xl font-semibold">Cozzywood Login</h1>
            <p className="mt-1 text-sm text-slate-300">Sign in to continue your watch room.</p>
          </div>

          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-amber-500/60 focus:ring"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Password</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-amber-500/60 focus:ring"
            />
          </label>

          {error ? <p className="rounded-lg border border-rose-600/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-500 px-3 py-2 font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>

          <p className="text-sm text-slate-300">
            New here?{" "}
            <Link to="/register" className="font-medium text-amber-300 hover:text-amber-200">
              Create account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
