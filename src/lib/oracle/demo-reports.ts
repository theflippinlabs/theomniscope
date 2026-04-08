import { runAnalysis } from "./agents/command-brain";
import { NFT_FIXTURES, TOKEN_FIXTURES, WALLET_FIXTURES } from "./mock-data";
import type { IntelligenceReport } from "./types";

/**
 * Pre-computed Oracle Sentinel reports for instant render on the
 * landing page and dashboard. These are deterministic — generated
 * once at module load — so they never depend on runtime effects.
 */

export const WALLET_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "wallet",
  wallet: WALLET_FIXTURES[0],
  identifier: WALLET_FIXTURES[0].address,
  label: WALLET_FIXTURES[0].label ?? WALLET_FIXTURES[0].address,
});

export const WALLET_RISKY_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "wallet",
  wallet: WALLET_FIXTURES[1],
  identifier: WALLET_FIXTURES[1].address,
  label: WALLET_FIXTURES[1].label ?? WALLET_FIXTURES[1].address,
});

export const TOKEN_SAFE_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "token",
  token: TOKEN_FIXTURES[0],
  identifier: TOKEN_FIXTURES[0].address,
  label: `${TOKEN_FIXTURES[0].name} (${TOKEN_FIXTURES[0].symbol})`,
});

export const TOKEN_RISKY_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "token",
  token: TOKEN_FIXTURES[1],
  identifier: TOKEN_FIXTURES[1].address,
  label: `${TOKEN_FIXTURES[1].name} (${TOKEN_FIXTURES[1].symbol})`,
});

export const NFT_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "nft",
  nft: NFT_FIXTURES[0],
  identifier: NFT_FIXTURES[0].contract,
  label: NFT_FIXTURES[0].name,
});

export const NFT_RISKY_DEMO_REPORT: IntelligenceReport = runAnalysis({
  entityType: "nft",
  nft: NFT_FIXTURES[1],
  identifier: NFT_FIXTURES[1].contract,
  label: NFT_FIXTURES[1].name,
});

export const DEMO_REPORTS = {
  wallet: WALLET_DEMO_REPORT,
  walletRisky: WALLET_RISKY_DEMO_REPORT,
  token: TOKEN_SAFE_DEMO_REPORT,
  tokenRisky: TOKEN_RISKY_DEMO_REPORT,
  nft: NFT_DEMO_REPORT,
  nftRisky: NFT_RISKY_DEMO_REPORT,
} as const;
