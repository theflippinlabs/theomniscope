import { describe, expect, it } from "vitest";
import {
  buildAnalysisMeta,
  buildAnalysisResult,
  buildSystemFlags,
  generateImpact,
  generateNextActions,
  type AnalysisResult,
} from "@/lib/analysis-meta";
import { defaultCommandBrain } from "@/lib/oracle/engine";

// ---------- fixtures ----------

function runFor(identifier: string) {
  return defaultCommandBrain.investigate({ identifier });
}

// ---------- buildAnalysisMeta ----------

describe("analysis-meta — buildAnalysisMeta", () => {
  it("returns durationMs, coveragePercent, agentCount for a real investigation", () => {
    const inv = runFor("MoonPaw Inu");
    const meta = buildAnalysisMeta(inv);
    expect(typeof meta.durationMs).toBe("number");
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(meta.coveragePercent).toBeGreaterThan(0);
    expect(meta.coveragePercent).toBeLessThanOrEqual(100);
    expect(meta.agentCount).toBeGreaterThan(0);
  });

  it("coveragePercent is 100 when every expected agent contributed", () => {
    const inv = runFor("MoonPaw Inu");
    const meta = buildAnalysisMeta(inv);
    expect(meta.coveragePercent).toBe(100);
  });

  it("excludes Risk Scoring and Report Synthesis from the specialized count", () => {
    const inv = runFor("MoonPaw Inu");
    const meta = buildAnalysisMeta(inv);
    const all = inv.agentOutputs.length;
    // 2 are meta agents (Risk Scoring + Report Synthesis)
    expect(meta.agentCount).toBe(all - 2);
  });
});

// ---------- buildSystemFlags ----------

describe("analysis-meta — buildSystemFlags", () => {
  it("flags crossSource when ≥ 3 specialized agents contribute", () => {
    const inv = runFor("MoonPaw Inu");
    const flags = buildSystemFlags(inv);
    expect(flags.crossSource).toBe(true);
    expect(flags.agentsUsed).toBeGreaterThanOrEqual(3);
  });

  it("flags patternDetection when Pattern Detection ran", () => {
    const inv = runFor("MoonPaw Inu");
    const flags = buildSystemFlags(inv);
    expect(flags.patternDetection).toBe(true);
  });

  it("agentsUsed excludes scoring + synthesis", () => {
    const inv = runFor("Whale 042");
    const flags = buildSystemFlags(inv);
    const meta = buildAnalysisMeta(inv);
    expect(flags.agentsUsed).toBe(meta.agentCount);
  });
});

// ---------- buildAnalysisResult ----------

describe("analysis-meta — buildAnalysisResult", () => {
  it("projects an Investigation into a unified AnalysisResult", () => {
    const inv = runFor("MoonPaw Inu");
    const result = buildAnalysisResult(inv);

    expect(result.verdict).toBe("avoid");
    expect(result.confidence).toBe(inv.overallConfidence.value);
    expect(result.score).toBe(inv.overallRiskScore);
    expect(result.riskLabel).toBe(inv.riskLabel);

    expect(result.entity.identifier).toBe(inv.entity.identifier);
    expect(result.entity.label).toBe(inv.entity.label);
    expect(result.entity.type).toBe("token");

    expect(result.executiveSummary).toBe(inv.executiveSummary);
    expect(result.whyThisMatters).toBe(inv.whyThisMatters);

    expect(result.meta.agentCount).toBeGreaterThan(0);
    expect(result.meta.coveragePercent).toBe(100);
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);

    expect(result.system.agentsUsed).toBe(result.meta.agentCount);
    expect(result.system.crossSource).toBe(true);
    expect(result.system.patternDetection).toBe(true);

    expect(result.report).toBe(inv);
  });

  it("verdict classifies correctly across demo entities", () => {
    expect(buildAnalysisResult(runFor("Whale 042")).verdict).toBe("safe");
    expect(buildAnalysisResult(runFor("Fresh Wallet 01")).verdict).toBe(
      "caution",
    );
    expect(buildAnalysisResult(runFor("MoonPaw Inu")).verdict).toBe("avoid");
    expect(buildAnalysisResult(runFor("Luminar Genesis")).verdict).toBe(
      "safe",
    );
    expect(
      buildAnalysisResult(runFor("Night Circuit Club")).verdict,
    ).toBe("caution");
  });
});

// ---------- generateNextActions ----------

describe("analysis-meta — generateNextActions", () => {
  it("returns avoid-tier actions for MoonPaw Inu", () => {
    const result = buildAnalysisResult(runFor("MoonPaw Inu"));
    const actions = generateNextActions(result);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.join(" ").toLowerCase()).toContain(
      "hold off on any new allocation",
    );
  });

  it("returns caution-tier actions for Fresh Wallet 01", () => {
    const result = buildAnalysisResult(runFor("Fresh Wallet 01"));
    const actions = generateNextActions(result);
    expect(actions.join(" ").toLowerCase()).toContain("monitor");
  });

  it("returns safe-tier actions for Whale 042", () => {
    const result = buildAnalysisResult(runFor("Whale 042"));
    const actions = generateNextActions(result);
    expect(actions.join(" ").toLowerCase()).toContain("watchlist monitoring");
  });

  it("adds driver-specific actions when findings match a pattern", () => {
    const result = buildAnalysisResult(runFor("MoonPaw Inu"));
    const actions = generateNextActions(result);
    // MoonPaw has mint authority + thin liquidity + mutable taxes,
    // so at least one driver-specific action should appear.
    const joined = actions.join(" ").toLowerCase();
    expect(
      /mint authority|liquidity stabilization|tax surface/.test(joined),
    ).toBe(true);
  });

  it("deduplicates actions in order", () => {
    const result = buildAnalysisResult(runFor("MoonPaw Inu"));
    const actions = generateNextActions(result);
    const normalized = actions.map((a) => a.trim().toLowerCase());
    const set = new Set(normalized);
    expect(set.size).toBe(normalized.length);
  });

  it("never returns an empty list", () => {
    for (const id of [
      "Whale 042",
      "Fresh Wallet 01",
      "MoonPaw Inu",
      "Luminar Genesis",
      "Night Circuit Club",
    ]) {
      const result = buildAnalysisResult(runFor(id));
      const actions = generateNextActions(result);
      expect(actions.length).toBeGreaterThan(0);
    }
  });
});

// ---------- generateImpact ----------

describe("analysis-meta — generateImpact", () => {
  it("returns the avoid-tier downside for MoonPaw Inu", () => {
    const result = buildAnalysisResult(runFor("MoonPaw Inu"));
    const impact = generateImpact(result);
    expect(impact.downside.toLowerCase()).toContain("capital loss");
    expect(impact.driver).toBeTruthy();
    expect(impact.recommendation.toLowerCase()).toContain("avoid exposure");
  });

  it("returns the safe-tier downside for Whale 042", () => {
    const result = buildAnalysisResult(runFor("Whale 042"));
    const impact = generateImpact(result);
    expect(impact.downside.toLowerCase()).toContain("no material");
    expect(impact.recommendation.toLowerCase()).toContain("standard");
  });

  it("driver matches the top finding when one exists", () => {
    const result = buildAnalysisResult(runFor("MoonPaw Inu"));
    const impact = generateImpact(result);
    expect(impact.driver).toBe(result.report.topFindings[0].title);
  });

  it("always returns three non-empty fields", () => {
    for (const id of [
      "Whale 042",
      "Fresh Wallet 01",
      "MoonPaw Inu",
      "Luminar Genesis",
    ]) {
      const result = buildAnalysisResult(runFor(id));
      const impact = generateImpact(result);
      expect(impact.downside).toBeTruthy();
      expect(impact.driver).toBeTruthy();
      expect(impact.recommendation).toBeTruthy();
    }
  });
});
