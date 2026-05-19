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
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/70 p-7 shadow-xl">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Cozzywood</p>
        <h1 className="mt-2 text-3xl font-semibold">Welcome, {user?.name}</h1>
        <p className="mt-3 text-slate-300">
          Phase 1 authentication is active. Protected routes, JWT access token, and secure refresh cookie are set up.
        </p>
        <p className="mt-2 text-slate-300">
          Phase 2 media player is available with YouTube search, Spotify integration scaffolding, HLS, and upload.
        </p>

        <div className="mt-6 grid gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm">
          <p>
            <span className="text-slate-400">User ID:</span> {user?.id}
          </p>
          <p>
            <span className="text-slate-400">Email:</span> {user?.email}
          </p>
          <p>
            <span className="text-slate-400">Created:</span>{" "}
            {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/media"
            className="rounded-lg border border-amber-400 px-4 py-2 font-medium text-amber-300 transition hover:bg-amber-500/10"
          >
            Open Media Room
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
