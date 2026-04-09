/**
 * Risk pattern detection.
 *
 * Each pattern is a heuristic that matches a recognizable failure
 * mode from historical Web3 post-mortems: mint-then-rug, mixer
 * funnel, wash-trade cluster, silent decline, contract trap,
 * coordinated launch, concentration exit risk, narrative
 * amplification.
 *
 * A pattern matches when enough of its indicators are present in the
 * current `KeyFinding` set (and optionally in the historical context).
 * Every matched pattern carries a confidence score based on the
 * number of indicators that fired.
 */

import type { MemoryEntry } from "../memory/types";
import type { Severity } from "../oracle/engine/types";
import type { RiskPattern, RiskPatternId } from "./types";

interface PatternMatcher {
  id: RiskPatternId;
  name: string;
  category: string;
  maxSeverity: Severity;
  /** Indicator titles to look for in keyFindings (case-insensitive substring match). */
  indicators: string[];
  /** Minimum number of indicators required to fire the pattern. */
  threshold: number;
  /** Extra amplifier narrative. */
  narrative: string;
}

const PATTERN_CATALOG: PatternMatcher[] = [
  {
    id: "mint_then_rug",
    name: "Mint-then-rug profile",
    category: "Contract",
    maxSeverity: "critical",
    indicators: [
      "mint authority",
      "thin liquidity",
      "low locked liquidity",
      "ownership not renounced",
      "upgradeable proxy",
    ],
    threshold: 3,
    narrative:
      "Mint authority combined with thin or unlocked liquidity is a classic rug signature — the deployer retains the ability to inflate supply and drain liquidity in a single transaction.",
  },
  {
    id: "mixer_funnel",
    name: "Mixer funnel",
    category: "Counterparty",
    maxSeverity: "high",
    indicators: [
      "mixer",
      "mixer-linked funding",
      "mixer → target chain pattern",
      "tornado",
      "unlimited token approvals granted",
    ],
    threshold: 2,
    narrative:
      "Mixer-origin funds flowing into a target execution path indicate an actor attempting to obscure provenance before engaging. Treat as high scrutiny.",
  },
  {
    id: "wash_trade_cluster",
    name: "Wash-trade cluster",
    category: "Market",
    maxSeverity: "high",
    indicators: [
      "wash-trade signature",
      "circular trade signature",
      "wash-trade pattern",
      "low distribution",
      "21+ nfts",
    ],
    threshold: 2,
    narrative:
      "Circular trades combined with concentrated ownership are consistent with manufactured volume and short-lived floor pumps. Reported marketcap or volume should not be trusted.",
  },
  {
    id: "silent_decline",
    name: "Silent decline",
    category: "Social",
    maxSeverity: "medium",
    indicators: [
      "narrative retraction",
      "communication decline",
      "low moderation activity",
      "slow support responsiveness",
      "narrative silence",
    ],
    threshold: 2,
    narrative:
      "Declining communication cadence combined with weak community stewardship is historically an early indicator of project abandonment. The on-chain state may not catch up for weeks.",
  },
  {
    id: "contract_trap",
    name: "Contract trap",
    category: "Contract",
    maxSeverity: "critical",
    indicators: [
      "honeypot",
      "honeypot pattern",
      "high sell tax",
      "mutable tax",
      "mint authority",
      "upgradeable proxy",
    ],
    threshold: 2,
    narrative:
      "Contract-level trap indicators (honeypot, high sell tax, mutable governance) mean the entity can be switched into a harmful state unilaterally. Do not engage until the admin surface is neutralized.",
  },
  {
    id: "coordinated_launch",
    name: "Coordinated launch",
    category: "Temporal",
    maxSeverity: "high",
    indicators: [
      "new token",
      "young wallet",
      "new launch",
      "tx burst",
      "narrative acceleration",
    ],
    threshold: 2,
    narrative:
      "New launches accompanied by wallet or narrative bursts are often coordinated — an early advantage for insiders rather than an organic opportunity.",
  },
  {
    id: "concentration_exit_risk",
    name: "Concentration exit risk",
    category: "Concentration",
    maxSeverity: "high",
    indicators: [
      "top holder concentration",
      "holders hold 21+",
      "high listing ratio",
      "high single-asset concentration",
      "whale concentration",
    ],
    threshold: 2,
    narrative:
      "Concentrated ownership combined with elevated exit pressure means a single holder can set the floor price unilaterally. Downside risk is not symmetric with upside.",
  },
  {
    id: "narrative_amplification",
    name: "Narrative amplification",
    category: "Social",
    maxSeverity: "medium",
    indicators: [
      "hype-heavy narrative",
      "lower authenticity signal",
      "narrative acceleration",
      "high listing ratio",
    ],
    threshold: 2,
    narrative:
      "Engagement quality heuristics suggest the narrative is amplified rather than organic. Market sentiment may move ahead of the substance it claims to represent.",
  },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matchIndicator(needle: string, haystack: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

/**
 * Detect every risk pattern that matches the current analysis. A
 * pattern fires when at least `threshold` of its indicators appear in
 * the current key findings (by case-insensitive substring match on
 * finding titles).
 */
export function detectRiskPatterns(current: MemoryEntry): RiskPattern[] {
  const titles = current.keyFindings.map((f) => f.title);
  const matched: RiskPattern[] = [];

  for (const p of PATTERN_CATALOG) {
    const hit: string[] = [];
    for (const indicator of p.indicators) {
      if (titles.some((t) => matchIndicator(indicator, t))) {
        hit.push(indicator);
      }
    }
    if (hit.length < p.threshold) continue;

    // Confidence scales with how many indicators fired vs the total.
    const ratio = hit.length / p.indicators.length;
    const confidence = Math.round(50 + ratio * 50); // 50..100

    // Final severity is the pattern's max severity, reduced one notch
    // if fewer than half of indicators fired.
    const severity: Severity =
      ratio < 0.5 ? reduceSeverity(p.maxSeverity) : p.maxSeverity;

    matched.push({
      id: p.id,
      name: p.name,
      category: p.category,
      severity,
      matchedIndicators: hit,
      confidence,
      narrative: p.narrative,
    });
  }

  // Most confident patterns first
  return matched.sort((a, b) => b.confidence - a.confidence);
}

function reduceSeverity(s: Severity): Severity {
  switch (s) {
    case "critical":
      return "high";
    case "high":
      return "medium";
    case "medium":
      return "low";
    case "low":
      return "info";
    case "info":
    default:
      return "info";
  }
}
