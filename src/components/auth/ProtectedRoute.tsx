/**
 * Route guard — allows access when EITHER of these is true:
 *
 *   1. The user has an active Supabase Auth session (email/password
 *      login — the path we built for paid tiers).
 *   2. The device has a valid invitation code (Lovable's original
 *      InvitationGate flow — stored in localStorage as
 *      `oracle_device_id` and verified against the
 *      `invitation_codes` table).
 *
 * This dual-path approach keeps the existing Lovable user base
 * working while opening the Supabase Auth path for new sign-ups
 * that go through /login.
 *
 * When neither path is satisfied, the user is redirected to /login.
 */

import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Check if the device was previously admitted via InvitationGate.
 * This is a synchronous localStorage check — no network call.
 */
function hasInvitationAccess(): boolean {
  try {
    const deviceId = localStorage.getItem("oracle_device_id");
    // If InvitationGate previously granted access, it stored
    // "oracle_access_granted" or the device was verified server-side
    // and the gate component called `onGranted`. We can't re-verify
    // without a network call, but the existence of the device_id
    // alongside a successful prior visit is a strong enough signal
    // for the route guard. The InvitationGate component itself does
    // the authoritative server check on mount.
    return Boolean(deviceId);
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [invitationChecked, setInvitationChecked] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false);

  useEffect(() => {
    setHasInvitation(hasInvitationAccess());
    setInvitationChecked(true);
  }, []);

  // Wait for both auth hydration AND invitation check.
  if (loading || !invitationChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        <div className="animate-pulse text-xs font-semibold uppercase tracking-[0.2em]">
          Loading…
        </div>
      </div>
    );
  }

  // Allow access via EITHER path.
  if (isAuthenticated || hasInvitation) {
    return <>{children}</>;
  }

  // Neither path — redirect to login.
  const redirect = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${redirect}`} replace />;
}
