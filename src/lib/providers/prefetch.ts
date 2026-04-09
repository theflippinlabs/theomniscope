/**
 * Prefetch helpers — the public async surface used by any caller
 * (UI, API route, edge function, CLI) to pull live data into the
 * shared cache before the engine runs.
 *
 * The engine itself remains synchronous; callers preload real
 * data first, then call the sync `investigate()` / `runAnalysis()`
 * which reads from the cache via the hybrid registry.
 *
 * Example:
 *
 *     import { prefetchEntity } from "@/lib/providers";
 *     import { defaultCommandBrain } from "@/lib/oracle/engine";
 *
 *     await prefetchEntity("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
 *     const investigation = defaultCommandBrain.investigate({
 *       identifier: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
 *     });
 */

import type {
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../oracle/types";
import type { SupportedChain } from "./config";
import { prefetchNftCollection } from "./nftProvider";
import { prefetchTokenProfile } from "./tokenProvider";
import { prefetchWalletProfile } from "./walletProvider";

export interface PrefetchOptions {
  chain?: SupportedChain;
}

export async function prefetchWallet(
  address: string,
  options: PrefetchOptions = {},
): Promise<WalletProfile | null> {
  return prefetchWalletProfile(address, options);
}

export async function prefetchToken(
  address: string,
  options: PrefetchOptions = {},
): Promise<TokenProfile | null> {
  return prefetchTokenProfile(address, options);
}

export async function prefetchNft(
  contract: string,
  options: PrefetchOptions = {},
): Promise<NFTCollectionProfile | null> {
  return prefetchNftCollection(contract, options);
}

export interface PrefetchEntityResult {
  kind: "wallet" | "token" | "nft" | "unknown";
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
}

/**
 * Auto-detect + prefetch. When the identifier looks like a
 * hex address, tries wallet / token / NFT in parallel and
 * returns whichever came back with real data.
 *
 * Falls back to "unknown" when nothing resolves — the caller can
 * still run the engine, which will use the mock fallback.
 */
export async function prefetchEntity(
  identifier: string,
  options: PrefetchOptions = {},
): Promise<PrefetchEntityResult> {
  const looksLikeAddress = /^0x[0-9a-fA-F]{40}$/.test(identifier.trim());
  if (!looksLikeAddress) {
    return { kind: "unknown" };
  }

  const [wallet, token, nft] = await Promise.all([
    prefetchWallet(identifier, options).catch(() => null),
    prefetchToken(identifier, options).catch(() => null),
    prefetchNft(identifier, options).catch(() => null),
  ]);

  // Prefer the most specific match: NFT > token > wallet.
  if (nft && nft.totalSupply > 0) {
    return { kind: "nft", nft, wallet: wallet ?? undefined, token: token ?? undefined };
  }
  if (token && token.symbol && token.symbol !== "???") {
    return { kind: "token", token, wallet: wallet ?? undefined };
  }
  if (wallet) {
    return { kind: "wallet", wallet };
  }
  return { kind: "unknown" };
}
