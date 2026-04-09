/**
 * Route guard — redirects unauthenticated users to /login.
 *
 * Wraps any route element that requires a Supabase session. While
 * the initial auth hydration is in-flight, renders a minimal
 * non-intrusive placeholder so the UI does not flash between
 * "signed out" and "signed in".
 */

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        <div className="animate-pulse text-xs font-semibold uppercase tracking-[0.2em]">
          Authenticating…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${redirect}`} replace />;
  }

  return <>{children}</>;
}
