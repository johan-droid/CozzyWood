import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function DashboardPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-8 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400/80">Cozzywood</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {user?.name}</h1>
        <p className="mt-4 text-sm text-slate-300 leading-relaxed">
          Phase 1 authentication is active. Protected routes, JWT access token, and secure refresh cookie are set up.
        </p>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Phase 2 media player is available with YouTube search, Spotify integration scaffolding, HLS, and upload.
        </p>

        <div className="mt-8 grid gap-3 rounded-xl border border-white/5 bg-black/20 p-5 text-sm">
          <p className="flex items-center gap-2">
            <span className="text-slate-400 font-medium min-w-[60px]">User ID:</span>
            <span className="font-mono text-xs text-slate-200">{user?.id}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400 font-medium min-w-[60px]">Email:</span>
            <span className="text-slate-200">{user?.email}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400 font-medium min-w-[60px]">Created:</span>{" "}
            <span className="text-slate-200">{user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/media"
            className="rounded-lg border border-amber-500/30 px-5 py-2.5 text-sm font-medium text-amber-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-500/10 active:scale-95"
          >
            Open Media Room
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
