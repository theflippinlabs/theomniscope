import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMemory,
  computeEvolution,
  forgetEntity,
  getHistory,
  getLastAnalysis,
  getLatestPerEntity,
  getRecentAnalyses,
  getScoreEvolution,
  investigationToMemoryEntry,
  saveAnalysis,
  snapshotToMemoryEntry,
  type MemoryEntry,
} from "@/lib/memory";
import { defaultCommandBrain, investigate } from "@/lib/oracle/engine";
import type { InvestigationSnapshot } from "@/lib/oracle/persistence";

// ---------- helpers ----------

function freshInvestigation(id: string) {
  return defaultCommandBrain.investigate({ identifier: id });
}

// The memory layer shares the default snapshot store, so we reset it
// between tests to avoid cross-test pollution.
beforeEach(async () => {
  await clearMemory();
});

// ---------- saveAnalysis ----------

describe("memory — saveAnalysis", () => {
  it("persists an Investigation as a MemoryEntry with the expected fields", async () => {
    const inv = freshInvestigation("MoonPaw Inu");
    const entry = await saveAnalysis(inv);

    expect(entry.entity.type).toBe("token");
    expect(entry.entity.identifier).toBe(inv.entity.identifier);
    expect(entry.entity.label).toBe(inv.entity.label);
    expect(entry.riskScore).toBe(inv.overallRiskScore);
    expect(entry.confidenceScore).toBe(inv.overallConfidence.value);
    expect(entry.riskLabel).toBe(inv.riskLabel);
    expect(entry.verdict).toBe("avoid");
    expect(entry.verdictSummary).toBe(inv.executiveSummary);
    expect(entry.keyFindings.length).toBeGreaterThan(0);
    for (const f of entry.keyFindings) {
      expect(typeof f.title).toBe("string");
      expect(typeof f.category).toBe("string");
      expect(["critical", "high", "medium", "low", "info"]).toContain(f.severity);
    }
  });

  it("assigns a classifyDecision verdict for every known tier", async () => {
    const cases: Array<{ id: string; verdict: MemoryEntry["verdict"] }> = [
      { id: "Whale 042", verdict: "safe" },
      { id: "Fresh Wallet 01", verdict: "caution" },
      { id: "MoonPaw Inu", verdict: "avoid" },
      { id: "Luminar Genesis", verdict: "safe" },
      { id: "Night Circuit Club", verdict: "caution" },
    ];
    for (const c of cases) {
      await clearMemory();
      const entry = await saveAnalysis(freshInvestigation(c.id));
      expect(entry.verdict).toBe(c.verdict);
    }
  });

  it("always carries a decision-grade verdict summary sentence", async () => {
    const entry = await saveAnalysis(freshInvestigation("MoonPaw Inu"));
    expect(entry.verdictSummary.toLowerCase()).toMatch(
      /high-risk profile|avoid exposure/,
    );
  });
});

// ---------- getHistory ----------

describe("memory — getHistory", () => {
  it("returns an empty array when nothing has been saved", async () => {
    const history = await getHistory("unknown-entity");
    expect(history).toEqual([]);
  });

  it("returns entries in oldest → newest order", async () => {
    const inv = freshInvestigation("MoonPaw Inu");
    // Save twice with slightly different timestamps (clock advances)
    await saveAnalysis(inv);
    await new Promise((r) => setTimeout(r, 5));
    await saveAnalysis(inv);
    const history = await getHistory(inv.entity.identifier);
    expect(history.length).toBe(2);
    expect(
      new Date(history[0].timestamp).getTime(),
    ).toBeLessThanOrEqual(new Date(history[1].timestamp).getTime());
  });

  it("accepts an identifier string", async () => {
    const inv = freshInvestigation("SALPHA");
    await saveAnalysis(inv);
    const history = await getHistory(inv.entity.identifier);
    expect(history.length).toBeGreaterThan(0);
  });

  it("accepts a ResolvedEntity-shaped object", async () => {
    const inv = freshInvestigation("SALPHA");
    await saveAnalysis(inv);
    const history = await getHistory({ identifier: inv.entity.identifier });
    expect(history.length).toBeGreaterThan(0);
  });

  it("accepts an Investigation-shaped object", async () => {
    const inv = freshInvestigation("SALPHA");
    await saveAnalysis(inv);
    const history = await getHistory({ entity: { identifier: inv.entity.identifier } });
    expect(history.length).toBeGreaterThan(0);
  });
});

// ---------- getLastAnalysis ----------

describe("memory — getLastAnalysis", () => {
  it("returns null when nothing has been saved", async () => {
    const last = await getLastAnalysis("unknown-entity");
    expect(last).toBeNull();
  });

  it("returns the most recent entry for the entity", async () => {
    const inv = freshInvestigation("MoonPaw Inu");
    await saveAnalysis(inv);
    const last = await getLastAnalysis(inv.entity.identifier);
    expect(last).toBeTruthy();
    expect(last!.entity.identifier).toBe(inv.entity.identifier);
    expect(last!.verdict).toBe("avoid");
  });

  it("ignores history from other entities", async () => {
    const moon = freshInvestigation("MoonPaw Inu");
    const whale = freshInvestigation("Whale 042");
    await saveAnalysis(moon);
    await saveAnalysis(whale);
    const lastWhale = await getLastAnalysis(whale.entity.identifier);
    expect(lastWhale).toBeTruthy();
    expect(lastWhale!.entity.identifier).toBe(whale.entity.identifier);
    expect(lastWhale!.verdict).toBe("safe");
  });
});

// ---------- getScoreEvolution ----------

describe("memory — getScoreEvolution", () => {
  it("returns null when no memory exists for the entity", async () => {
    const ev = await getScoreEvolution("unknown-entity");
    expect(ev).toBeNull();
  });

  it("returns a full evolution summary from multiple saves", async () => {
    const inv = freshInvestigation("MoonPaw Inu");
    await saveAnalysis(inv);
    await new Promise((r) => setTimeout(r, 5));
    await saveAnalysis(inv);
    await new Promise((r) => setTimeout(r, 5));
    await saveAnalysis(inv);
    const ev = await getScoreEvolution(inv.entity.identifier);
    expect(ev).toBeTruthy();
    expect(ev!.points.length).toBe(3);
    expect(ev!.scoreNow).toBe(inv.overallRiskScore);
    expect(ev!.scoreThen).toBe(inv.overallRiskScore);
    expect(ev!.scoreDelta).toBe(0);
    expect(ev!.volatility).toBe(0);
    expect(ev!.direction).toBe("stable");
    expect(ev!.latestVerdict).toBe("avoid");
  });

  it("detects deteriorating trajectories", () => {
    const entries: MemoryEntry[] = [
      {
        id: "1",
        entity: { identifier: "x", label: "x", type: "token" },
        timestamp: "2026-04-01T00:00:00Z",
        riskScore: 20,
        confidenceScore: 70,
        verdict: "safe",
        verdictSummary: "",
        riskLabel: "Promising",
        trendDirection: "stable",
        keyFindings: [],
      },
      {
        id: "2",
        entity: { identifier: "x", label: "x", type: "token" },
        timestamp: "2026-04-02T00:00:00Z",
        riskScore: 55,
        confidenceScore: 65,
        verdict: "caution",
        verdictSummary: "",
        riskLabel: "Neutral",
        trendDirection: "stable",
        keyFindings: [],
      },
      {
        id: "3",
        entity: { identifier: "x", label: "x", type: "token" },
        timestamp: "2026-04-03T00:00:00Z",
        riskScore: 85,
        confidenceScore: 60,
        verdict: "avoid",
        verdictSummary: "",
        riskLabel: "High Risk",
        trendDirection: "stable",
        keyFindings: [],
      },
    ];
    const ev = computeEvolution(entries);
    expect(ev).toBeTruthy();
    expect(ev!.direction).toBe("deteriorating");
    expect(ev!.scoreDelta).toBe(65);
    expect(ev!.volatility).toBe(65);
    expect(ev!.latestVerdict).toBe("avoid");
  });

  it("detects improving trajectories", () => {
    const entries: MemoryEntry[] = [
      {
        id: "1",
        entity: { identifier: "y", label: "y", type: "wallet" },
        timestamp: "2026-04-01T00:00:00Z",
        riskScore: 80,
        confidenceScore: 60,
        verdict: "avoid",
        verdictSummary: "",
        riskLabel: "High Risk",
        trendDirection: "stable",
        keyFindings: [],
      },
      {
        id: "2",
        entity: { identifier: "y", label: "y", type: "wallet" },
        timestamp: "2026-04-02T00:00:00Z",
        riskScore: 30,
        confidenceScore: 80,
        verdict: "safe",
        verdictSummary: "",
        riskLabel: "Promising",
        trendDirection: "stable",
        keyFindings: [],
      },
    ];
    const ev = computeEvolution(entries);
    expect(ev).toBeTruthy();
    expect(ev!.direction).toBe("improving");
    expect(ev!.scoreDelta).toBe(-50);
  });
});

// ---------- cross-entity helpers ----------

describe("memory — cross-entity helpers", () => {
  it("getRecentAnalyses returns newest first across all entities", async () => {
    await saveAnalysis(freshInvestigation("Whale 042"));
    await new Promise((r) => setTimeout(r, 5));
    await saveAnalysis(freshInvestigation("MoonPaw Inu"));
    const recent = await getRecentAnalyses(10);
    expect(recent.length).toBe(2);
    // Newest first
    expect(
      new Date(recent[0].timestamp).getTime(),
    ).toBeGreaterThanOrEqual(new Date(recent[1].timestamp).getTime());
  });

  it("getLatestPerEntity collapses to one entry per entity", async () => {
    const moon = freshInvestigation("MoonPaw Inu");
    await saveAnalysis(moon);
    await saveAnalysis(moon);
    await saveAnalysis(freshInvestigation("Whale 042"));
    const latest = await getLatestPerEntity();
    const identifiers = latest.map((e) => e.entity.identifier);
    // Each identifier appears exactly once
    expect(new Set(identifiers).size).toBe(identifiers.length);
    expect(identifiers).toHaveLength(2);
  });

  it("forgetEntity removes history for one entity only", async () => {
    const moon = freshInvestigation("MoonPaw Inu");
    const whale = freshInvestigation("Whale 042");
    await saveAnalysis(moon);
    await saveAnalysis(whale);
    await forgetEntity(moon.entity.identifier);
    expect(await getHistory(moon.entity.identifier)).toEqual([]);
    expect((await getHistory(whale.entity.identifier)).length).toBe(1);
  });
});

// ---------- adapter back-fill ----------

describe("memory — snapshotToMemoryEntry back-fill", () => {
  it("derives verdict from legacy snapshots without a verdict field", () => {
    const legacy: InvestigationSnapshot = {
      id: "legacy-1",
      entityIdentifier: "0xabc",
      entityLabel: "Legacy Token",
      entityType: "token",
      takenAt: "2026-03-01T00:00:00Z",
      riskScore: 85,
      confidence: 70,
      riskLabel: "High Risk",
      trendDirection: "deteriorating",
      topFindingsCount: 5,
      highSeverityCount: 3,
      summary: "legacy summary",
      // verdict + keyFindings intentionally missing
    };
    const entry = snapshotToMemoryEntry(legacy);
    expect(entry.verdict).toBe("avoid");
    expect(entry.keyFindings).toEqual([]);
    expect(entry.entity.identifier).toBe("0xabc");
    expect(entry.riskScore).toBe(85);
  });
});

// ---------- investigationToMemoryEntry ----------

describe("memory — investigationToMemoryEntry (direct projection)", () => {
  it("builds a MemoryEntry without touching the store", () => {
    const inv = freshInvestigation("MoonPaw Inu");
    const entry = investigationToMemoryEntry(inv);
    expect(entry.verdict).toBe("avoid");
    expect(entry.riskScore).toBe(inv.overallRiskScore);
    expect(entry.keyFindings.length).toBeGreaterThan(0);
  });
});
