import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function ProtectedRoute({ children }) {
  const { isBooting, isAuthenticated } = useAuth();

  if (isBooting) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-sm tracking-wide text-slate-300">Checking session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
