/**
 * Risk matrix builder.
 *
 * Groups key findings by their category and produces a matrix of
 * RiskMatrixCell entries, each with aggregate severity, count, a
 * dominant finding title, and a weighted score contribution. The
 * matrix is the structured input used by the full report's "risk
 * matrix" section.
 */

import type { KeyFinding } from "../memory/types";
import type { Severity } from "../oracle/engine/types";
import type { RiskCategory, RiskMatrix, RiskMatrixCell } from "./types";

/**
 * Canonical category list. Any finding that does not map to one of
 * these lands in "Other". Coverage is computed against this list so
 * a hot matrix that touches only one category reports low coverage.
 */
const CANONICAL_CATEGORIES: RiskCategory[] = [
  "Contract",
  "Liquidity",
  "Market",
  "Ownership",
  "Concentration",
  "On-chain",
  "Counterparty",
  "Social",
  "Community",
  "Temporal",
  "Provenance",
  "Governance",
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 35,
  high: 22,
  medium: 12,
  low: 5,
  info: 1,
};

/**
 * Normalize a free-form finding category to one of the canonical
 * risk-matrix buckets. Agent-produced categories like "Taxes",
 * "Architecture", or "Permissions" are rolled up to a canonical one.
 */
function normalizeCategory(raw: string): RiskCategory {
  const k = raw.trim().toLowerCase();
  if (k.includes("contract") || k === "architecture" || k === "permissions") return "Contract";
  if (k.includes("liquidity")) return "Liquidity";
  if (k === "market" || k === "taxes" || k.includes("market integrity")) return "Market";
  if (k.includes("ownership") || k.includes("governance")) return k.includes("governance") ? "Governance" : "Ownership";
  if (k.includes("concentration") || k.includes("distribution")) return "Concentration";
  if (k.includes("counterparty")) return "Counterparty";
  if (k.includes("chain") || k === "hygiene" || k === "maturity") return "On-chain";
  if (k === "narrative" || k === "trust" || k === "silence" || k === "social") return "Social";
  if (k.includes("moderation") || k.includes("support") || k.includes("anomaly") || k === "community") return "Community";
  if (k.includes("temporal") || k === "behavioral" || k === "clustering" || k === "wash") return "Temporal";
  if (k.includes("provenance") || k === "integration" || k === "baseline") return "Provenance";
  return "Other";
}

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Build a risk matrix from a list of key findings.
 *
 * Rules:
 *   - One cell per category that has at least one finding
 *   - Cell severity is the max severity of its findings
 *   - weightedScore is the sum of severity weights (capped at 100)
 *   - dominantFinding is the most-severe finding title in the category
 *   - coverage is % of canonical categories that have any finding
 *   - hotspots are cells with severity >= high
 *   - dominantCategory is the single cell with the highest weightedScore
 */
export function buildRiskMatrix(findings: KeyFinding[]): RiskMatrix {
  const byCategory = new Map<
    RiskCategory,
    {
      severity: Severity;
      count: number;
      weightedScore: number;
      dominantFinding?: string;
      dominantRank: number;
    }
  >();

  for (const f of findings) {
    const category = normalizeCategory(f.category);
    const existing = byCategory.get(category);
    const rank = SEVERITY_RANK[f.severity];
    const weight = SEVERITY_WEIGHT[f.severity];

    if (!existing) {
      byCategory.set(category, {
        severity: f.severity,
        count: 1,
        weightedScore: weight,
        dominantFinding: f.title,
        dominantRank: rank,
      });
    } else {
      existing.count += 1;
      existing.weightedScore = Math.min(100, existing.weightedScore + weight);
      if (rank > existing.dominantRank) {
        existing.severity = maxSeverity(existing.severity, f.severity);
        existing.dominantFinding = f.title;
        existing.dominantRank = rank;
      }
    }
  }

  const cells: RiskMatrixCell[] = [...byCategory.entries()]
    .map(([category, v]) => ({
      category,
      severity: v.severity,
      count: v.count,
      dominantFinding: v.dominantFinding,
      weightedScore: v.weightedScore,
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const hotspots = cells.filter(
    (c) => c.severity === "critical" || c.severity === "high",
  );

  const touched = new Set(cells.map((c) => c.category));
  const canonicalTouched = CANONICAL_CATEGORIES.filter((c) => touched.has(c));
  const coverage = Math.round(
    (canonicalTouched.length / CANONICAL_CATEGORIES.length) * 100,
  );

  const dominantCategory = cells[0]?.category;

  return {
    cells,
    hotspots,
    coverage,
    dominantCategory,
  };
}
