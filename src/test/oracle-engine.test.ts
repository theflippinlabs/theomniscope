import { describe, expect, it } from "vitest";
import {
  CommandBrain,
  buildMockProviderRegistry,
  detectEntityType,
  investigate,
  labelFromScore,
  trendFromScore,
  type Investigation,
} from "@/lib/oracle/engine";
import { investigationToReport } from "@/lib/oracle/engine/adapter";

describe("Oracle engine — Command Brain", () => {
  it("resolves a labeled wallet and produces a complete investigation", () => {
    const brain = new CommandBrain();
    const inv = brain.investigate({ identifier: "Whale 042" });
    expect(inv.entityType).toBe("wallet");
    expect(inv.entity.label).toBe("Whale 042");
    expect(inv.participatingAgents).toContain("On-Chain Analyst");
    expect(inv.participatingAgents).toContain("Risk Scoring");
    expect(inv.participatingAgents).toContain("Report Synthesis");
    expect(inv.scoreBreakdown.length).toBeGreaterThan(0);
    expect(inv.log.length).toBeGreaterThan(0);
    expect(inv.executiveSummary).toBeTruthy();
  });

  it("classifies a clean wallet as low risk", () => {
    const inv = investigate({ identifier: "Whale 042" });
    expect(inv.overallRiskScore).toBeLessThan(40);
    expect(["Promising", "Neutral", "Under Review"]).toContain(inv.riskLabel);
  });

  it("classifies a mixer-funded wallet as elevated risk", () => {
    const inv = investigate({ identifier: "Fresh Wallet 01" });
    expect(inv.overallRiskScore).toBeGreaterThan(40);
    expect(
      inv.topFindings.some((f) => f.title.toLowerCase().includes("mixer")),
    ).toBe(true);
  });

  it("classifies a mintable token with mutable taxes as high risk", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    expect(inv.overallRiskScore).toBeGreaterThanOrEqual(80);
    expect(inv.riskLabel).toBe("High Risk");
    expect(inv.recommendations.length).toBeGreaterThan(0);
  });

  it("attaches per-agent confidence rationales", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    for (const o of inv.agentOutputs) {
      expect(o.confidence.value).toBeGreaterThanOrEqual(0);
      expect(o.confidence.value).toBeLessThanOrEqual(100);
      expect(o.confidence.rationale).toBeTruthy();
    }
  });

  it("backfills weightedContribution after risk scoring", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const tokenRiskOutput = inv.agentOutputs.find(
      (o) => o.agentName === "Token Risk",
    );
    expect(tokenRiskOutput).toBeTruthy();
    expect(tokenRiskOutput!.scoreImpact.weightedContribution).toBeGreaterThan(0);
  });

  it("never reports 100% confidence on a partial pipeline", () => {
    const inv = investigate({ identifier: "Whale 042" });
    expect(inv.overallConfidence.value).toBeLessThanOrEqual(99);
    expect(inv.overallConfidence.rationale).toContain("agents contributed");
  });

  it("emits a non-empty investigation log with structured entries", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    expect(inv.log.length).toBeGreaterThan(2);
    for (const e of inv.log) {
      expect(e.at).toBeTruthy();
      expect(e.source).toBeTruthy();
      expect(e.message).toBeTruthy();
    }
  });

  it("preserves both sides of agent conflicts when they disagree", () => {
    // We can't force a conflict without crafting a custom provider, but
    // the schema must always be present and correctly typed.
    const inv = investigate({ identifier: "MoonPaw Inu" });
    expect(Array.isArray(inv.conflicts)).toBe(true);
    inv.conflicts.forEach((c) => {
      expect(c.agents.length).toBeGreaterThanOrEqual(2);
      expect(c.confidencePenalty).toBeGreaterThanOrEqual(0);
    });
  });

  it("adapter converts an Investigation into a legacy IntelligenceReport", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const legacy = investigationToReport(inv);
    expect(legacy.riskScore).toBe(inv.overallRiskScore);
    expect(legacy.confidence).toBe(inv.overallConfidence.value);
    expect(legacy.entity.type).toBe("token");
    expect(legacy.findings.length).toBeGreaterThan(0);
    expect(legacy.breakdown.length).toBeGreaterThan(0);
    expect(legacy.nextActions.length).toBeGreaterThan(0);
  });

  it("maps engine nft_collection → legacy nft in the adapter", () => {
    const inv = investigate({ identifier: "Luminar Genesis" });
    expect(inv.entityType).toBe("nft_collection");
    const legacy = investigationToReport(inv);
    expect(legacy.entity.type).toBe("nft");
  });

  it("detectEntityType returns the legacy type form for the analyzer router", () => {
    const det = detectEntityType("Night Circuit Club");
    expect(det).toBe("nft_collection");
  });
});

describe("Oracle engine — scoring helpers", () => {
  it("labels Under Review when confidence is below 35", () => {
    expect(labelFromScore(80, 20)).toBe("Under Review");
    expect(labelFromScore(10, 30)).toBe("Under Review");
  });

  it("respects score thresholds when confidence is healthy", () => {
    expect(labelFromScore(85, 80)).toBe("High Risk");
    expect(labelFromScore(65, 80)).toBe("Elevated Risk");
    expect(labelFromScore(45, 80)).toBe("Neutral");
    expect(labelFromScore(15, 80)).toBe("Promising");
  });

  it("derives a trend direction from a relative score", () => {
    expect(trendFromScore(30)).toBe("improving");
    expect(trendFromScore(40)).toBe("stable");
    expect(trendFromScore(80)).toBe("deteriorating");
  });
});

describe("Oracle engine — providers", () => {
  it("buildMockProviderRegistry exposes all expected providers", () => {
    const reg = buildMockProviderRegistry();
    expect(typeof reg.wallet.resolve).toBe("function");
    expect(typeof reg.token.resolve).toBe("function");
    expect(typeof reg.nft.resolve).toBe("function");
    expect(typeof reg.social.fetch).toBe("function");
    expect(typeof reg.community.fetch).toBe("function");
  });

  it("mock social provider returns deterministic snapshots", () => {
    const reg = buildMockProviderRegistry();
    const a = reg.social.fetch("MoonPaw Inu", "MPAW", "token");
    const b = reg.social.fetch("MoonPaw Inu", "MPAW", "token");
    expect(a).toEqual(b);
  });
});

describe("Oracle engine — output schema integrity", () => {
  it("every agent output has the standard fields", () => {
    const inv: Investigation = investigate({ identifier: "Whale 042" });
    for (const o of inv.agentOutputs) {
      expect(o.agentName).toBeTruthy();
      expect(["wallet", "token", "nft_collection", "mixed"]).toContain(o.entityType);
      expect(["ok", "partial", "degraded", "error"]).toContain(o.status);
      expect(typeof o.summary).toBe("string");
      expect(Array.isArray(o.findings)).toBe(true);
      expect(Array.isArray(o.alerts)).toBe(true);
      expect(Array.isArray(o.evidence)).toBe(true);
      expect(typeof o.scoreImpact.positive).toBe("number");
      expect(typeof o.scoreImpact.negative).toBe("number");
      expect(typeof o.scoreImpact.neutral).toBe("number");
      expect(typeof o.scoreImpact.weightedContribution).toBe("number");
      expect(typeof o.confidence.value).toBe("number");
      expect(typeof o.confidence.rationale).toBe("string");
      expect(typeof o.metadata.durationMs).toBe("number");
      expect(typeof o.metadata.version).toBe("string");
      expect(typeof o.metadata.runId).toBe("string");
    }
  });
});
