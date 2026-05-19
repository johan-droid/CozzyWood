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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
        <form className="w-full space-y-5 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-7 shadow-xl backdrop-blur" onSubmit={onSubmit}>
          <div>
            <h1 className="text-2xl font-semibold">Create Account</h1>
            <p className="mt-1 text-sm text-slate-300">Phase 1 supports up to 2 registered users.</p>
          </div>

          <label className="block space-y-2 text-sm">
            <span>Name</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-rose-400/60 focus:ring"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-rose-400/60 focus:ring"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Password</span>
            <input
              type="password"
              minLength={8}
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-rose-400/60 focus:ring"
            />
          </label>

          {error ? <p className="rounded-lg border border-rose-600/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-rose-400 px-3 py-2 font-medium text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          <p className="text-sm text-slate-300">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-rose-300 hover:text-rose-200">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
