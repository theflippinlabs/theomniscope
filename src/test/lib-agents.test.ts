import { describe, expect, it } from "vitest";
import {
  CommandBrain,
  NFTAgent,
  TokenAgent,
  WalletAgent,
  analyze,
  buildScoreBreakdown,
  calculateConfidence,
  calculateRiskScore,
  commandBrain,
  mergeAgentOutputs,
  normalizeAlerts,
  normalizeFindings,
  type AgentResult,
  type SimpleAlert,
  type SimpleFinding,
} from "@/lib/agents";

// ---------- scoring ----------

describe("lib/agents — scoring helpers", () => {
  it("calculateRiskScore handles an empty contribution list", () => {
    expect(calculateRiskScore([])).toBe(0);
  });

  it("calculateRiskScore produces a weighted average", () => {
    const score = calculateRiskScore([
      { weight: 0.5, value: 20 },
      { weight: 0.5, value: 80 },
    ]);
    // Average 50, amplified to max(50, 80*0.8=64) → 64
    expect(score).toBe(64);
  });

  it("calculateRiskScore clamps to [0, 100]", () => {
    expect(calculateRiskScore([{ weight: 1, value: -30 }])).toBe(0);
    expect(calculateRiskScore([{ weight: 1, value: 200 }])).toBe(100);
  });

  it("calculateRiskScore amplifies strong single signals", () => {
    const score = calculateRiskScore([
      { weight: 0.1, value: 90 },
      { weight: 0.9, value: 0 },
    ]);
    // weighted avg ≈ 9, but max 90 × 0.8 = 72 sets the floor
    expect(score).toBeGreaterThanOrEqual(72);
  });

  it("calculateConfidence returns 0 for empty input", () => {
    expect(calculateConfidence([])).toBe(0);
  });

  it("calculateConfidence averages values", () => {
    expect(calculateConfidence([60, 80, 100])).toBe(80);
  });

  it("calculateConfidence scales by coverage", () => {
    // 2 values, expected 4 → coverage 0.5 → avg 80 × 0.5 = 40
    expect(calculateConfidence([80, 80], 4)).toBe(40);
  });

  it("buildScoreBreakdown sorts by weighted contribution descending", () => {
    const results: Record<string, AgentResult> = {
      Alpha: { findings: [], alerts: [], scoreImpact: 20, confidence: 70, summary: "a" },
      Beta: { findings: [], alerts: [], scoreImpact: 60, confidence: 70, summary: "b" },
      Gamma: { findings: [], alerts: [], scoreImpact: 40, confidence: 70, summary: "c" },
    };
    const weights = { Alpha: 0.5, Beta: 0.1, Gamma: 0.4 };
    const breakdown = buildScoreBreakdown(results, weights);
    // Alpha 20×0.5=10, Beta 60×0.1=6, Gamma 40×0.4=16
    expect(breakdown.map((b) => b.label)).toEqual(["Gamma", "Alpha", "Beta"]);
    expect(breakdown[0].weighted).toBeCloseTo(16);
  });

  it("buildScoreBreakdown falls back to default weight for unknown agents", () => {
    const results: Record<string, AgentResult> = {
      Unknown: { findings: [], alerts: [], scoreImpact: 50, confidence: 70, summary: "x" },
    };
    const breakdown = buildScoreBreakdown(results, {});
    expect(breakdown[0].weight).toBe(0.1);
  });
});

// ---------- normalization ----------

describe("lib/agents — normalization helpers", () => {
  const findings: SimpleFinding[] = [
    { id: "1", title: "Mixer exposure", description: "a", severity: "high", category: "X" },
    { id: "2", title: "Healthy distribution", description: "b", severity: "info", category: "Y" },
    { id: "3", title: "mixer exposure", description: "dup", severity: "critical", category: "Z" },
    { id: "4", title: "Whale concentration", description: "c", severity: "medium", category: "W" },
  ];

  it("normalizeFindings dedupes by title case-insensitively", () => {
    const out = normalizeFindings(findings);
    expect(out.length).toBe(3);
    expect(out.map((f) => f.title.toLowerCase())).toContain("mixer exposure");
  });

  it("normalizeFindings sorts most-severe first", () => {
    const out = normalizeFindings(findings);
    expect(out[0].severity).toBe("high");
    expect(out[out.length - 1].severity).toBe("info");
  });

  it("normalizeFindings tolerates null entries", () => {
    const mixed = [...findings, null as unknown as SimpleFinding];
    expect(() => normalizeFindings(mixed)).not.toThrow();
  });

  it("normalizeAlerts dedupes and sorts by level", () => {
    const alerts: SimpleAlert[] = [
      { id: "1", title: "Honeypot", level: "critical", reason: "a" },
      { id: "2", title: "HONEYPOT", level: "high", reason: "dup" },
      { id: "3", title: "Silence", level: "low", reason: "b" },
    ];
    const out = normalizeAlerts(alerts);
    expect(out.length).toBe(2);
    expect(out[0].level).toBe("critical");
  });

  it("mergeAgentOutputs returns a safe zero-value for an empty input", () => {
    const merged = mergeAgentOutputs([]);
    expect(merged.findings).toEqual([]);
    expect(merged.alerts).toEqual([]);
    expect(merged.scoreImpact).toBe(0);
    expect(merged.confidence).toBe(0);
    expect(merged.summary).toBe("");
  });

  it("mergeAgentOutputs merges multiple results and amplifies strong impact", () => {
    const a: AgentResult = {
      findings: [
        { id: "f1", title: "Approval leak", description: "x", severity: "medium", category: "A" },
      ],
      alerts: [],
      scoreImpact: 20,
      confidence: 80,
      summary: "calm",
    };
    const b: AgentResult = {
      findings: [
        { id: "f2", title: "Mixer exposure", description: "y", severity: "high", category: "B" },
      ],
      alerts: [{ id: "a1", title: "Mixer alert", level: "high", reason: "mixer" }],
      scoreImpact: 90,
      confidence: 60,
      summary: "alarm",
    };
    const merged = mergeAgentOutputs([a, b]);
    expect(merged.findings.length).toBe(2);
    expect(merged.findings[0].severity).toBe("high");
    expect(merged.alerts.length).toBe(1);
    // max 90 × 0.8 = 72 sets the floor
    expect(merged.scoreImpact).toBeGreaterThanOrEqual(72);
    expect(merged.confidence).toBe(70);
    expect(merged.summary.startsWith("alarm")).toBe(true);
  });
});

// ---------- entity agents ----------

describe("lib/agents — WalletAgent / TokenAgent / NFTAgent", () => {
  it("WalletAgent classifies a clean whale as low impact", () => {
    const r = new WalletAgent().analyze("Whale 042");
    expect(r.scoreImpact).toBeLessThan(35);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it("WalletAgent flags mixer-funded wallets with a high-severity finding", () => {
    const r = new WalletAgent().analyze("Fresh Wallet 01");
    const titles = r.findings.map((f) => f.title.toLowerCase());
    expect(titles.some((t) => t.includes("mixer"))).toBe(true);
    expect(r.scoreImpact).toBeGreaterThan(30);
  });

  it("TokenAgent flags MoonPaw as high risk with critical/high findings", () => {
    const r = new TokenAgent().analyze("MoonPaw Inu");
    const hasCriticalOrHigh = r.findings.some(
      (f) => f.severity === "critical" || f.severity === "high",
    );
    expect(hasCriticalOrHigh).toBe(true);
    expect(r.scoreImpact).toBeGreaterThan(60);
  });

  it("NFTAgent surfaces a wash-trade finding on Night Circuit Club", () => {
    const r = new NFTAgent().analyze("Night Circuit Club");
    const titles = r.findings.map((f) => f.title.toLowerCase());
    expect(
      titles.some((t) => t.includes("wash") || t.includes("circular")),
    ).toBe(true);
  });

  it("every agent result honors the facade shape", () => {
    const all = [
      new WalletAgent().analyze("Whale 042"),
      new TokenAgent().analyze("SALPHA"),
      new NFTAgent().analyze("Luminar Genesis"),
    ];
    for (const r of all) {
      expect(Array.isArray(r.findings)).toBe(true);
      expect(Array.isArray(r.alerts)).toBe(true);
      expect(typeof r.scoreImpact).toBe("number");
      expect(typeof r.confidence).toBe("number");
      expect(typeof r.summary).toBe("string");
      expect(r.scoreImpact).toBeGreaterThanOrEqual(0);
      expect(r.scoreImpact).toBeLessThanOrEqual(100);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(100);
    }
  });
});

// ---------- CommandBrain pipeline ----------

describe("lib/agents — CommandBrain pipeline", () => {
  it("auto-detects a wallet entity from its label", () => {
    const result = commandBrain.analyze({ identifier: "Whale 042" });
    expect(result.entity.type).toBe("wallet");
    expect(result.entity.label).toBe("Whale 042");
  });

  it("auto-detects a token from its symbol and produces a non-zero score", () => {
    const result = commandBrain.analyze({ identifier: "MoonPaw Inu" });
    expect(result.entity.type).toBe("token");
    expect(result.riskScore).toBeGreaterThan(60);
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it("auto-detects an NFT collection from its name", () => {
    const result = commandBrain.analyze({ identifier: "Luminar Genesis" });
    expect(result.entity.type).toBe("nft");
  });

  it("respects an explicit type hint", () => {
    const result = commandBrain.analyze({
      identifier: "MoonPaw Inu",
      type: "token",
    });
    expect(result.entity.type).toBe("token");
  });

  it("produces a PipelineResult with every documented field", () => {
    const result = analyze({ identifier: "Fresh Wallet 01" });
    expect(result.entity).toBeTruthy();
    expect(typeof result.riskScore).toBe("number");
    expect(typeof result.confidenceScore).toBe("number");
    expect(Array.isArray(result.breakdown)).toBe(true);
    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(typeof result.agentResults).toBe("object");
    expect(typeof result.summary).toBe("string");
  });

  it("breakdown contains a single weighted entry for the selected agent", () => {
    const result = analyze({ identifier: "SALPHA" });
    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0].label).toBe("TokenAgent");
    expect(result.breakdown[0].weight).toBe(1);
  });

  it("pipeline never throws on an unresolved identifier", () => {
    expect(() =>
      new CommandBrain().analyze({ identifier: "definitely-not-a-real-thing" }),
    ).not.toThrow();
  });
});
