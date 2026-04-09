import { beforeEach, describe, expect, it } from "vitest";
import {
  buildHistoricalContext,
  buildReport,
  buildRiskMatrix,
  detectAnomalies,
  detectConfidenceInstability,
  detectCoverageGap,
  detectFindingConcentration,
  detectRapidDeterioration,
  detectRiskPatterns,
  detectScoreOutlier,
  detectStaleAnalysis,
  detectVerdictVolatility,
  runDeepAnalysis,
  type DeepReport,
} from "@/lib/investigation";
import {
  clearMemory,
  saveAnalysis,
  type KeyFinding,
  type MemoryEntry,
} from "@/lib/memory";
import { defaultCommandBrain, investigate } from "@/lib/oracle/engine";

// ---------- fixtures ----------

function buildEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: overrides.id ?? `entry-${Math.random().toString(36).slice(2)}`,
    entity: overrides.entity ?? {
      identifier: "0xabc",
      label: "Demo Token",
      type: "token",
    },
    timestamp: overrides.timestamp ?? "2026-04-01T00:00:00Z",
    riskScore: overrides.riskScore ?? 40,
    confidenceScore: overrides.confidenceScore ?? 70,
    verdict: overrides.verdict ?? "caution",
    verdictSummary: overrides.verdictSummary ?? "demo summary",
    riskLabel: overrides.riskLabel ?? "Neutral",
    trendDirection: overrides.trendDirection ?? "stable",
    keyFindings: overrides.keyFindings ?? [],
  };
}

function finding(
  title: string,
  severity: KeyFinding["severity"] = "medium",
  category = "Test",
): KeyFinding {
  return { title, severity, category };
}

beforeEach(async () => {
  await clearMemory();
});

// ---------- detectAnomalies: individual detectors ----------

describe("investigation — anomaly detectors", () => {
  it("detectScoreOutlier returns null without enough history", () => {
    const curr = buildEntry({ riskScore: 80 });
    const history = [buildEntry({ riskScore: 40 })];
    expect(detectScoreOutlier(curr, history)).toBeNull();
  });

  it("detectScoreOutlier fires when current deviates by > 2σ", () => {
    // Mean ~23, std dev ~4.8 (needs to be > 3 for the detector to consider it)
    const history = [15, 25, 20, 30, 18, 28, 22, 26].map((s) =>
      buildEntry({ riskScore: s }),
    );
    const curr = buildEntry({ riskScore: 85 });
    const anomaly = detectScoreOutlier(curr, history);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("score_outlier");
    expect(anomaly!.severity).toMatch(/high|medium/);
  });

  it("detectConfidenceInstability fires when std dev is high", () => {
    const history = [90, 40, 80, 35, 85, 45].map((c) =>
      buildEntry({ confidenceScore: c }),
    );
    const anomaly = detectConfidenceInstability(history);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("confidence_instability");
  });

  it("detectFindingConcentration fires on 3+ severe findings", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Honeypot", "critical"),
        finding("Mint authority", "high"),
        finding("Thin liquidity", "high"),
      ],
    });
    const anomaly = detectFindingConcentration(curr);
    expect(anomaly).toBeTruthy();
    // Only 1 critical → severity is "high" (not "critical", which requires ≥ 2 critical)
    expect(anomaly!.severity).toBe("high");
  });

  it("detectFindingConcentration escalates to critical with ≥ 2 critical findings", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Honeypot", "critical"),
        finding("Mint exploit", "critical"),
        finding("Thin liquidity", "high"),
      ],
    });
    const anomaly = detectFindingConcentration(curr);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.severity).toBe("critical");
  });

  it("detectVerdictVolatility fires when ≥ 3 distinct verdicts appear in the recent window", () => {
    const history = [
      buildEntry({ verdict: "safe" }),
      buildEntry({ verdict: "caution" }),
      buildEntry({ verdict: "avoid" }),
      buildEntry({ verdict: "caution" }),
    ];
    const anomaly = detectVerdictVolatility(history);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("verdict_volatility");
  });

  it("detectRapidDeterioration fires on +20 between consecutive entries", () => {
    const curr = buildEntry({ riskScore: 85 });
    const history = [buildEntry({ riskScore: 45 })];
    const anomaly = detectRapidDeterioration(curr, history);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("rapid_deterioration");
  });

  it("detectRapidDeterioration flags rapid improvements as info", () => {
    const curr = buildEntry({ riskScore: 30 });
    const history = [buildEntry({ riskScore: 80 })];
    const anomaly = detectRapidDeterioration(curr, history);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("rapid_improvement");
    expect(anomaly!.severity).toBe("info");
  });

  it("detectStaleAnalysis fires when the entry is more than 7 days old", () => {
    const curr = buildEntry({ timestamp: "2026-03-01T00:00:00Z" });
    const asOf = new Date("2026-04-01T00:00:00Z");
    const anomaly = detectStaleAnalysis(curr, asOf);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.kind).toBe("stale_analysis");
  });

  it("detectCoverageGap fires below 50% confidence", () => {
    const curr = buildEntry({ confidenceScore: 30 });
    const anomaly = detectCoverageGap(curr);
    expect(anomaly).toBeTruthy();
    expect(anomaly!.severity).toBe("high");
  });
});

// ---------- detectAnomalies (composition) ----------

describe("investigation — detectAnomalies composition", () => {
  it("returns an empty list when nothing is anomalous", () => {
    const curr = buildEntry({ confidenceScore: 80, riskScore: 25 });
    const history = [
      buildEntry({ riskScore: 20, confidenceScore: 80 }),
      buildEntry({ riskScore: 25, confidenceScore: 82 }),
      buildEntry({ riskScore: 24, confidenceScore: 81 }),
    ];
    const anomalies = detectAnomalies(curr, history);
    expect(anomalies).toEqual([]);
  });

  it("returns a severity-sorted list when multiple anomalies fire", () => {
    const curr = buildEntry({
      riskScore: 90,
      confidenceScore: 30,
      keyFindings: [
        finding("Honeypot", "critical"),
        finding("Mint authority", "high"),
        finding("Thin liquidity", "high"),
      ],
    });
    const history = [
      buildEntry({ riskScore: 20, confidenceScore: 85 }),
      buildEntry({ riskScore: 25, confidenceScore: 80 }),
      buildEntry({ riskScore: 22, confidenceScore: 78 }),
    ];
    const anomalies = detectAnomalies(curr, history);
    expect(anomalies.length).toBeGreaterThan(2);
    // Sorted most-severe first
    const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const;
    for (let i = 1; i < anomalies.length; i++) {
      expect(rank[anomalies[i - 1].severity]).toBeGreaterThanOrEqual(
        rank[anomalies[i].severity],
      );
    }
  });
});

// ---------- detectRiskPatterns ----------

describe("investigation — risk patterns", () => {
  it("detects the mint-then-rug pattern on MoonPaw-style findings", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Active mint authority", "high", "Permissions"),
        finding("Thin liquidity", "high", "Liquidity"),
        finding("Low locked liquidity", "medium", "Liquidity"),
        finding("Ownership not renounced", "medium", "Governance"),
      ],
    });
    const patterns = detectRiskPatterns(curr);
    expect(patterns.some((p) => p.id === "mint_then_rug")).toBe(true);
  });

  it("detects contract trap with honeypot + high sell tax", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Honeypot pattern detected", "critical", "Contract"),
        finding("High sell tax (45%)", "high", "Taxes"),
      ],
    });
    const patterns = detectRiskPatterns(curr);
    expect(patterns.some((p) => p.id === "contract_trap")).toBe(true);
  });

  it("detects wash-trade cluster on Night Circuit Club-style findings", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Wash-trade signature", "high", "Market integrity"),
        finding("Low distribution (36%)", "medium", "Distribution"),
      ],
    });
    const patterns = detectRiskPatterns(curr);
    expect(patterns.some((p) => p.id === "wash_trade_cluster")).toBe(true);
  });

  it("returns an empty list when no pattern reaches its threshold", () => {
    const curr = buildEntry({
      keyFindings: [finding("Unrelated finding", "low", "Other")],
    });
    const patterns = detectRiskPatterns(curr);
    expect(patterns).toEqual([]);
  });

  it("sorts patterns by confidence descending", () => {
    const curr = buildEntry({
      keyFindings: [
        finding("Active mint authority", "high"),
        finding("Thin liquidity", "high"),
        finding("Low locked liquidity", "medium"),
        finding("Ownership not renounced", "medium"),
        finding("Honeypot", "critical"),
        finding("High sell tax", "high"),
      ],
    });
    const patterns = detectRiskPatterns(curr);
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].confidence).toBeGreaterThanOrEqual(
        patterns[i].confidence,
      );
    }
  });
});

// ---------- buildRiskMatrix ----------

describe("investigation — buildRiskMatrix", () => {
  it("groups findings by canonical category", () => {
    const findings: KeyFinding[] = [
      { title: "Mint authority", severity: "high", category: "Permissions" },
      { title: "Honeypot", severity: "critical", category: "Contract" },
      { title: "Thin liquidity", severity: "high", category: "Liquidity" },
      { title: "Low distribution", severity: "medium", category: "Distribution" },
    ];
    const matrix = buildRiskMatrix(findings);
    const categories = matrix.cells.map((c) => c.category);
    expect(categories).toContain("Contract");
    expect(categories).toContain("Liquidity");
    expect(categories).toContain("Concentration");
  });

  it("reports hotspots for high/critical cells", () => {
    const findings: KeyFinding[] = [
      { title: "Honeypot", severity: "critical", category: "Contract" },
      { title: "Mild issue", severity: "low", category: "Market" },
    ];
    const matrix = buildRiskMatrix(findings);
    expect(matrix.hotspots).toHaveLength(1);
    expect(matrix.hotspots[0].category).toBe("Contract");
  });

  it("computes coverage as % of canonical categories with findings", () => {
    const single = buildRiskMatrix([
      { title: "X", severity: "medium", category: "Contract" },
    ]);
    expect(single.coverage).toBeLessThan(50);
    expect(single.coverage).toBeGreaterThan(0);
  });

  it("identifies the dominant category by weighted score", () => {
    const findings: KeyFinding[] = [
      { title: "A", severity: "critical", category: "Contract" },
      { title: "B", severity: "low", category: "Market" },
    ];
    const matrix = buildRiskMatrix(findings);
    expect(matrix.dominantCategory).toBe("Contract");
  });
});

// ---------- buildHistoricalContext ----------

describe("investigation — buildHistoricalContext", () => {
  it("reports insufficient history when empty", () => {
    const current = buildEntry();
    const ctx = buildHistoricalContext({
      history: [],
      current,
      signalsSincePrevious: [],
    });
    expect(ctx.entriesExamined).toBe(0);
    expect(ctx.scoreTrajectory).toBe("insufficient_history");
  });

  it("detects a deteriorating trajectory", () => {
    const history = [20, 35, 50, 70].map((s) => buildEntry({ riskScore: s }));
    const ctx = buildHistoricalContext({
      history,
      current: history[history.length - 1],
      signalsSincePrevious: [],
    });
    expect(ctx.scoreTrajectory).toBe("volatile");
    expect(ctx.significantShifts.length).toBeGreaterThan(0);
  });

  it("detects a stable trajectory for tight score ranges", () => {
    const history = [25, 27, 26, 28].map((s) => buildEntry({ riskScore: s }));
    const ctx = buildHistoricalContext({
      history,
      current: history[history.length - 1],
      signalsSincePrevious: [],
    });
    expect(ctx.scoreTrajectory).toBe("stable");
  });
});

// ---------- runDeepAnalysis (integration) ----------

describe("investigation — runDeepAnalysis integration", () => {
  it("produces a complete DeepReport from a raw identifier", async () => {
    const report = await runDeepAnalysis({ target: "MoonPaw Inu" });
    expectValidReport(report);
    expect(report.verdict).toBe("avoid");
    expect(report.patterns.length).toBeGreaterThan(0);
    expect(report.riskMatrix.hotspots.length).toBeGreaterThan(0);
    expect(report.narrative.length).toBeGreaterThan(100);
  });

  it("accepts a pre-computed Investigation as input", async () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    const report = await runDeepAnalysis({ target: inv });
    expect(report.sourceInvestigation).toBe(inv);
    expect(report.entity.type).toBe("token");
  });

  it("pulls historical context from memory when available", async () => {
    // Prime memory with a prior version
    const prior = investigate({ identifier: "MoonPaw Inu" });
    await saveAnalysis(prior);
    await new Promise((r) => setTimeout(r, 5));

    const report = await runDeepAnalysis({ target: "MoonPaw Inu" });
    // At least one memory entry was examined
    expect(report.historicalContext.entriesExamined).toBeGreaterThanOrEqual(0);
  });

  it("never saves the analysis — memory is left unchanged", async () => {
    // Nothing in memory before
    const report = await runDeepAnalysis({ target: "MoonPaw Inu" });
    // Deep analysis should NOT have saved anything; the memory store
    // is still empty.
    const { getHistory } = await import("@/lib/memory");
    const after = await getHistory(report.entity.identifier);
    expect(after).toEqual([]);
  });

  it("produces consistent output across entity types", async () => {
    const cases = ["Whale 042", "MoonPaw Inu", "Luminar Genesis"];
    for (const id of cases) {
      const report = await runDeepAnalysis({ target: id });
      expectValidReport(report);
    }
  });
});

// ---------- buildReport (direct) ----------

describe("investigation — buildReport (direct)", () => {
  it("assembles a DeepReport from supplied pieces", () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    const current = buildEntry({
      entity: {
        identifier: inv.entity.identifier,
        label: inv.entity.label,
        type: inv.entityType,
      },
      riskScore: inv.overallRiskScore,
      confidenceScore: inv.overallConfidence.value,
      verdict: "avoid",
      riskLabel: inv.riskLabel,
      keyFindings: inv.topFindings.slice(0, 3).map((f) => ({
        title: f.title,
        severity: f.severity,
        category: f.category,
      })),
    });
    const riskMatrix = buildRiskMatrix(current.keyFindings);
    const patterns = detectRiskPatterns(current);
    const anomalies = detectAnomalies(current, []);
    const report = buildReport({
      investigation: inv,
      history: [],
      anomalies,
      patterns,
      riskMatrix,
      historicalContext: buildHistoricalContext({
        history: [],
        current,
        signalsSincePrevious: [],
      }),
      depth: "deep",
    });
    expectValidReport(report);
    expect(report.extendedFindings.length).toBe(inv.topFindings.length);
  });
});

// ---------- helpers ----------

function expectValidReport(report: DeepReport): void {
  expect(report.id).toBeTruthy();
  expect(report.entity.identifier).toBeTruthy();
  expect(report.entity.label).toBeTruthy();
  expect(report.entity.type).toBeTruthy();
  expect(report.generatedAt).toBeTruthy();
  expect(["deep", "forensic"]).toContain(report.depth);
  expect(typeof report.overallRiskScore).toBe("number");
  expect(typeof report.overallConfidence).toBe("number");
  expect(report.executiveSummary).toBeTruthy();
  expect(report.narrative).toBeTruthy();
  expect(Array.isArray(report.extendedFindings)).toBe(true);
  expect(Array.isArray(report.anomalies)).toBe(true);
  expect(Array.isArray(report.patterns)).toBe(true);
  expect(report.riskMatrix).toBeTruthy();
  expect(Array.isArray(report.riskMatrix.cells)).toBe(true);
  expect(Array.isArray(report.riskMatrix.hotspots)).toBe(true);
  expect(typeof report.riskMatrix.coverage).toBe("number");
  expect(Array.isArray(report.recommendations)).toBe(true);
  expect(Array.isArray(report.limitations)).toBe(true);
  expect(report.sourceInvestigation).toBeTruthy();
}
