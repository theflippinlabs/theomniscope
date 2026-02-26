import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CMC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "CMC_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const symbols = url.searchParams.get("symbols") || "BTC,ETH,PEPE,BONK,CRO";

    const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbols)}&convert=USD`;

    const cmcRes = await fetch(cmcUrl, {
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        "Accept": "application/json",
      },
    });

    const cmcData = await cmcRes.json();

    if (!cmcRes.ok) {
      return new Response(JSON.stringify({ error: "CMC API error", detail: cmcData }), {
        status: cmcRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens: Record<string, unknown> = {};

    if (cmcData.data) {
      for (const [symbol, rawEntry] of Object.entries(cmcData.data)) {
        const entry = Array.isArray(rawEntry) ? (rawEntry as any[])[0] : rawEntry as any;
        const quote = entry?.quote?.USD;
        if (!quote) continue;
        tokens[symbol] = {
          cmcId: entry.id,
          symbol: entry.symbol,
          name: entry.name,
          price: quote.price,
          priceChange1h: quote.percent_change_1h ?? 0,
          priceChange24h: quote.percent_change_24h ?? 0,
          priceChange7d: quote.percent_change_7d ?? 0,
          volume24h: quote.volume_24h ?? 0,
          marketCap: quote.market_cap ?? 0,
          lastUpdated: quote.last_updated,
        };
      }
    }

    return new Response(JSON.stringify({ tokens, timestamp: Date.now() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
