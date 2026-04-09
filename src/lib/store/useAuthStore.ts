/**
 * Oracle Sentinel — Zustand auth + billing store.
 *
 * Single source of truth for the authenticated user, their plan tier,
 * and today's usage counter. The store is fed by:
 *
 *   1. `initAuthListener()` (called once from `App.tsx`) — subscribes
 *      to Supabase auth changes and refreshes the profile row.
 *   2. `refreshUsage()` — called after each successful analysis to
 *      pull the latest `oracle_usage_daily.analysis_count` from DB.
 *
 * The store never fetches data on its own; components read from it
 * synchronously via `useAuthStore((s) => ...)`. Analyzer pages that
 * need loading / live-data / completeness indicators keep their
 * per-page local state unchanged — this store is specifically for
 * cross-cutting concerns (user, plan, quota).
 */

import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/plans/types";

export interface ProfileRow {
  id: string;
  email: string | null;
  plan: PlanTier;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
}

export interface AuthState {
  /** Raw Supabase session. Null when not signed in. */
  session: Session | null;
  /** Raw Supabase user. Null when not signed in. */
  user: SupabaseUser | null;
  /** Normalized profile row from `public.profiles`. */
  profile: ProfileRow | null;
  /** Analyses consumed today across all devices. */
  usageToday: number;
  /** True while the initial session load is in-flight. */
  loading: boolean;
  /** Last auth error (sign-in / sign-up). Cleared on success. */
  error: string | null;

  // ----- actions -----
  setSession(session: Session | null): Promise<void>;
  signIn(email: string, password: string): Promise<{ error: string | null }>;
  signUp(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  refreshUsage(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  usageToday: 0,
  loading: true,
  error: null,

  async setSession(session) {
    set({ session, user: session?.user ?? null, loading: false, error: null });
    if (session?.user) {
      await Promise.all([get().refreshProfile(), get().refreshUsage()]);
    } else {
      set({ profile: null, usageToday: 0 });
    }
  },

  async signIn(email, password) {
    set({ error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    await get().setSession(data.session);
    return { error: null };
  },

  async signUp(email, password) {
    set({ error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    // When email confirmation is enabled, `data.session` is null until
    // the user confirms — the listener will pick it up later.
    if (data.session) {
      await get().setSession(data.session);
    }
    return { error: null };
  },

  async signOut() {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, usageToday: 0 });
  },

  async refreshProfile() {
    const user = get().user;
    if (!user) {
      set({ profile: null });
      return;
    }
    // Typed as any so this file doesn't depend on the generated
    // `Database` definition being regenerated against the new
    // migration — the column shapes are stable.
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
          };
        };
      };
    })
      .from("profiles")
      .select(
        "id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      set({
        profile: {
          id: user.id,
          email: user.email ?? null,
          plan: "free",
        },
      });
      return;
    }

    set({
      profile: {
        id: String(data.id),
        email: (data.email as string | null) ?? user.email ?? null,
        plan: ((data.plan as PlanTier) ?? "free") as PlanTier,
        stripeCustomerId: (data.stripe_customer_id as string | null) ?? null,
        stripeSubscriptionId:
          (data.stripe_subscription_id as string | null) ?? null,
        subscriptionStatus:
          (data.subscription_status as string | null) ?? null,
      },
    });
  },

  async refreshUsage() {
    const user = get().user;
    if (!user) {
      set({ usageToday: 0 });
      return;
    }
    const { data } = await (supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: number | null }>;
    }).rpc("get_oracle_usage_today", { p_user_id: user.id });
    set({ usageToday: typeof data === "number" ? data : 0 });
  },
}));

/**
 * Subscribe to Supabase auth changes. Call this once at app startup.
 * Returns an unsubscribe function.
 */
export function initAuthListener(): () => void {
  // Hydrate the current session first so components that read on
  // mount see the right value instead of a flash of signed-out UI.
  void supabase.auth.getSession().then(({ data }) => {
    void useAuthStore.getState().setSession(data.session ?? null);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    void useAuthStore.getState().setSession(session ?? null);
  });

  return () => sub.subscription.unsubscribe();
}

/**
 * Convenience selectors.
 */
export const selectIsAuthenticated = (s: AuthState): boolean =>
  Boolean(s.session?.user);

export const selectPlanTier = (s: AuthState): PlanTier =>
  s.profile?.plan ?? "free";
