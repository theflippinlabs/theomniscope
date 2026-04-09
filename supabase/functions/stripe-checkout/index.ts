// Oracle Sentinel — Stripe checkout session creator.
//
// Deploy:
//     supabase functions deploy stripe-checkout
//     supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//     supabase secrets set STRIPE_PRICE_PRO=price_...
//     supabase secrets set STRIPE_PRICE_ELITE=price_...
//     supabase secrets set APP_URL=https://your-domain.com
//
// Request (POST, authenticated):
//     { "plan": "pro" | "elite" }
//
// Response:
//     { "url": "https://checkout.stripe.com/..." }  — redirect target

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...CORS, "content-type": "application/json" };

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO") ?? "";
const STRIPE_PRICE_ELITE = Deno.env.get("STRIPE_PRICE_ELITE") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const PRICE_MAP: Record<string, string> = {
  pro: STRIPE_PRICE_PRO,
  elite: STRIPE_PRICE_ELITE,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResp } = await authedClient.auth.getUser();
  const user = userResp?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: { plan?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const priceId = PRICE_MAP[body.plan ?? ""];
  if (!priceId) {
    return new Response(JSON.stringify({ error: "unknown plan" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Reuse an existing Stripe customer if we've created one for this
  // user before; otherwise create a fresh one and persist the id.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = (profile?.stripe_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? (profile?.email as string | undefined) ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/app/settings?checkout=success`,
    cancel_url: `${APP_URL}/app/settings?checkout=cancelled`,
    metadata: {
      supabase_user_id: user.id,
      plan: body.plan ?? "",
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: body.plan ?? "",
      },
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: JSON_HEADERS,
  });
});
