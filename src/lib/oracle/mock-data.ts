/**
 * Oracle Sentinel — fixtures re-export wrapper.
 *
 * All demo data now lives in `src/demo/fixtures.ts`. This file
 * remains as a stable import path so existing `@/lib/oracle/mock-data`
 * imports throughout the app continue to work without a churn-heavy
 * rename. New code should import from `@/demo/fixtures` directly.
 */

export {
  WALLET_FIXTURES,
  TOKEN_FIXTURES,
  NFT_FIXTURES,
  WATCHLIST_FIXTURES,
  HISTORICAL_CALLS,
  INVESTIGATIONS,
  REPORTS,
  LIVE_FEED,
} from "@/demo/fixtures";
