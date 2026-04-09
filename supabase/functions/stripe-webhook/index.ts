// Oracle Sentinel — Stripe webhook handler.
//
// Deploy:
//     supabase functions deploy stripe-webhook --no-verify-jwt
//     supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//     supabase secrets set STRIPE_PRICE_PRO=price_...
//     supabase secrets set STRIPE_PRICE_ELITE=price_...
//
// Stripe dashboard → webhooks → add endpoint:
//     https://<project>.functions.supabase.co/stripe-webhook
//
// Events handled:
//   checkout.session.completed      — fresh subscription, flip plan
//   customer.subscription.updated   — plan change / renewal
//   customer.subscription.deleted   — cancellation, revert to free

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO") ?? "";
const STRIPE_PRICE_ELITE = Deno.env.get("STRIPE_PRICE_ELITE") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

function planFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  if (priceId === STRIPE_PRICE_ELITE) return "elite";
  if (priceId === STRIPE_PRICE_PRO) return "pro";
  return "free";
}

async function updateProfileFromSubscription(sub: Stripe.Subscription) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const plan = sub.status === "canceled" ? "free" : planFromPriceId(priceId);

  await admin
    .from("profiles")
    .update({
      plan,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return new Response(
      `webhook signature verification failed: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
          await updateProfileFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateProfileFromSubscription(sub);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
