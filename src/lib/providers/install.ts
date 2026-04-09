/**
 * Install helper — swap the default CommandBrain's provider
 * registry to a HybridProviderRegistry so the engine reads from
 * the HTTP cache with mock fallback.
 *
 * Usage:
 *
 *     // Once at app boot:
 *     installHttpProviders();
 *
 *     // Then, anywhere a user queries an address:
 *     await prefetchEntity("0x...");
 *     const inv = defaultCommandBrain.investigate({ identifier: "0x..." });
 *
 * Omitting `installHttpProviders()` leaves the default mock
 * behavior in place — every existing test, seed, and demo report
 * continues to work exactly as before.
 */

import { defaultCommandBrain } from "../oracle/engine/command-brain";
import type { CommandBrain } from "../oracle/engine/command-brain";
import { buildHybridProviderRegistry } from "./registry";

export function installHttpProviders(
  brain: CommandBrain = defaultCommandBrain,
): void {
  brain.setProviders(buildHybridProviderRegistry());
}
