/**
 * Thin hook around the Zustand auth store. Callers get the user,
 * profile, plan tier, and action handlers without importing the
 * store directly.
 */

import { useAuthStore, selectIsAuthenticated, selectPlanTier } from "@/lib/store/useAuthStore";

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const planTier = useAuthStore(selectPlanTier);
  const usageToday = useAuthStore((s) => s.usageToday);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshUsage = useAuthStore((s) => s.refreshUsage);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  return {
    session,
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    planTier,
    usageToday,
    signIn,
    signUp,
    signOut,
    refreshUsage,
    refreshProfile,
  };
}
