/**
 * Stripe checkout initiator — asks the Supabase edge function to
 * create a Checkout session and redirects the browser to the
 * returned URL.
 *
 * Usage:
 *     import { startCheckout } from "@/lib/billing/checkout";
 *     await startCheckout("pro");
 *
 * Environment:
 *     VITE_STRIPE_CHECKOUT_URL — URL of the `stripe-checkout` edge
 *     function, e.g.
 *     https://<project>.functions.supabase.co/stripe-checkout
 */

import { supabase } from "@/integrations/supabase/client";

export type CheckoutPlan = "pro" | "elite";

export interface CheckoutResult {
  ok: boolean;
  error?: string;
}

function readEnv(key: string): string | undefined {
  const viteEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  return viteEnv?.[key];
}

/**
 * Create a Stripe Checkout session and navigate to it. Never throws
 * — returns an `{ ok, error }` result so callers can surface the
 * failure in the UI.
 */
export async function startCheckout(
  plan: CheckoutPlan,
): Promise<CheckoutResult> {
  const url = readEnv("VITE_STRIPE_CHECKOUT_URL");
  if (!url) {
    return { ok: false, error: "Checkout is not configured." };
  }

  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } catch {
    // ignore
  }
  if (!token) {
    return { ok: false, error: "You must be signed in to upgrade." };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });
    if (!resp.ok) {
      return {
        ok: false,
        error: `Checkout failed (${resp.status}).`,
      };
    }
    const body = (await resp.json()) as { url?: string; error?: string };
    if (!body.url) {
      return { ok: false, error: body.error ?? "Checkout failed." };
    }
    window.location.assign(body.url);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message || "Unexpected checkout error.",
    };
  }
}
