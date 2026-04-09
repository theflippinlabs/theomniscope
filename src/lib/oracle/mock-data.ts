/**
 * Oracle Sentinel — fixtures re-export wrapper.
 *
 * All demo data now lives in `src/demo/fixtures.ts`. This file
 * remains as a stable import path so existing `@/lib/oracle/mock-data`
 * imports throughout the app continue to work without a churn-heavy
 * rename. New code should import from `@/demo/fixtures` directly.
 */

// Note: HISTORICAL_CALLS has been removed from this re-export. The
// "track record" page used to display fabricated verdicts; it now
// renders a "No track record yet" empty state until a real ledger
// of resolved analyses exists.

export {
  WALLET_FIXTURES,
  TOKEN_FIXTURES,
  NFT_FIXTURES,
  WATCHLIST_FIXTURES,
  INVESTIGATIONS,
  REPORTS,
  LIVE_FEED,
} from "@/demo/fixtures";
