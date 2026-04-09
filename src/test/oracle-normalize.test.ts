import { describe, expect, it } from "vitest";
import {
  alertSummaryFrom,
  buildExecutiveSummary,
  buildWhyThisMatters,
  defaultCommandBrain,
  investigate,
  normalizeInvestigation,
  prioritizeFindings,
  reduceAlertNoise,
  type Alert,
  type Conflict,
  type Finding,
  type Investigation,
  type ScoreBreakdownEntry,
} from "@/lib/oracle/engine";
import { investigationToReport } from "@/lib/oracle/engine/adapter";

// ---------- fixtures ----------

function f(partial: Partial<Finding>): Finding {
  return {
    id: partial.id ?? "f-x",
    title: partial.title ?? "Untitled finding",
    description: partial.description ?? "demo",
    severity: partial.severity ?? "info",
    category: partial.category ?? "Test",
  };
}

function a(partial: Partial<Alert>): Alert {
  return {
    id: partial.id ?? "a-x",
    title: partial.title ?? "Untitled alert",
    level: partial.level ?? "info",
    reason: partial.reason ?? "demo",
  };
}

// ---------- prioritizeFindings ----------

describe("normalize — prioritizeFindings", () => {
  it("deduplicates findings by title case-insensitively, keeping highest severity", () => {
    const result = prioritizeFindings([
      f({ title: "Mixer exposure", severity: "high" }),
      f({ title: "mixer exposure", severity: "critical" }),
      f({ title: "MIXER EXPOSURE", severity: "medium" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
  });

  it("sorts findings most-severe-first", () => {
    const result = prioritizeFindings([
      f({ title: "Low A", severity: "low" }),
      f({ title: "Critical A", severity: "critical" }),
      f({ title: "High A", severity: "high" }),
      f({ title: "Medium A", severity: "medium" }),
      f({ title: "Info A", severity: "info" }),
    ]);
    expect(result.map((x) => x.severity)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
      "info",
    ]);
  });

  it("caps the result at the configured max", () => {
    const findings: Finding[] = [];
    for (let i = 0; i < 30; i++) {
      findings.push(f({ id: `f${i}`, title: `Finding ${i}`, severity: "medium" }));
    }
    expect(prioritizeFindings(findings, 12)).toHaveLength(12);
    expect(prioritizeFindings(findings, 5)).toHaveLength(5);
  });

  it("tolerates undefined / null / title-less entries without throwing", () => {
    const input: Finding[] = [
      f({ title: "Keep me", severity: "high" }),
      null as unknown as Finding,
      undefined as unknown as Finding,
      f({ title: "", severity: "high" }),
    ];
    const result = prioritizeFindings(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Keep me");
  });

  it("returns an empty array for empty input", () => {
    expect(prioritizeFindings([])).toEqual([]);
  });
});

// ---------- reduceAlertNoise ----------

describe("normalize — reduceAlertNoise", () => {
  it("drops info and low level alerts entirely", () => {
    const result = reduceAlertNoise([
      a({ title: "Info one", level: "info" }),
      a({ title: "Low one", level: "low" }),
      a({ title: "Medium one", level: "medium" }),
      a({ title: "High one", level: "high" }),
      a({ title: "Critical one", level: "critical" }),
    ]);
    expect(result).toHaveLength(3);
    expect(result.map((x) => x.level)).toEqual(["critical", "high", "medium"]);
  });

  it("deduplicates alerts by normalized title, keeping highest severity", () => {
    const result = reduceAlertNoise([
      a({ title: "Mixer alert", level: "medium" }),
      a({ title: "mixer  alert", level: "high" }),
      a({ title: "MIXER ALERT", level: "critical" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("critical");
  });

  it("sorts most-severe-first and caps at max", () => {
    const alerts: Alert[] = [];
    for (let i = 0; i < 20; i++) {
      alerts.push(a({ id: `a${i}`, title: `Alert ${i}`, level: "medium" }));
    }
    alerts.push(a({ title: "Critical one", level: "critical" }));
    alerts.push(a({ title: "High one", level: "high" }));
    const result = reduceAlertNoise(alerts, 6);
    expect(result).toHaveLength(6);
    expect(result[0].level).toBe("critical");
    expect(result[1].level).toBe("high");
  });

  it("returns an empty array for empty input", () => {
    expect(reduceAlertNoise([])).toEqual([]);
  });

  it("tolerates null / undefined / title-less entries", () => {
    const result = reduceAlertNoise([
      null as unknown as Alert,
      undefined as unknown as Alert,
      a({ title: "", level: "high" }),
      a({ title: "Real", level: "high" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Real");
  });
});

// ---------- alertSummaryFrom ----------

describe("normalize — alertSummaryFrom", () => {
  it("counts alerts by level", () => {
    const summary = alertSummaryFrom([
      a({ title: "1", level: "critical" }),
      a({ title: "2", level: "critical" }),
      a({ title: "3", level: "high" }),
      a({ title: "4", level: "medium" }),
      a({ title: "5", level: "low" }),
      a({ title: "6", level: "info" }),
    ]);
    expect(summary).toEqual({
      critical: 2,
      high: 1,
      medium: 1,
      low: 1,
      info: 1,
    });
  });
});

// ---------- buildExecutiveSummary ----------

describe("normalize — buildExecutiveSummary", () => {
  const baseBreakdown: ScoreBreakdownEntry[] = [
    {
      agent: "Token Risk",
      weight: 0.45,
      rawScore: 90,
      weighted: 40.5,
      rationale: "contract risk",
    },
  ];

  it("produces a decisive 1–2 sentence summary with drivers inlined as prose", () => {
    const summary = buildExecutiveSummary({
      entityLabel: "MoonPaw Inu",
      entityType: "token",
      score: 93,
      confidence: 57,
      riskLabel: "High Risk",
      topFindings: [
        f({ title: "Active mint authority", severity: "high" }),
        f({ title: "Thin liquidity", severity: "high" }),
      ],
      scoreBreakdown: baseBreakdown,
    });
    expect(summary.toLowerCase()).toContain("high risk identified");
    expect(summary.toLowerCase()).toContain("token");
    expect(summary.toLowerCase()).toContain("active mint authority");
    expect(summary.toLowerCase()).toContain("thin liquidity");
    expect(summary.toLowerCase()).toContain("do not hold exposure");
    // No numeric clutter, no hedging words
    expect(summary).not.toMatch(/\/100/);
    expect(summary.toLowerCase()).not.toMatch(/\bmight\b|\bcould\b|\bpossibly\b/);
    expect(summary.length).toBeLessThan(300);
    const sentences = summary.split(/\.\s+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("produces decisive clean-state summaries with the correct noun", () => {
    const walletSummary = buildExecutiveSummary({
      entityLabel: "Whale 042",
      entityType: "wallet",
      score: 10,
      confidence: 61,
      riskLabel: "Promising",
      topFindings: [],
      scoreBreakdown: [
        {
          agent: "On-Chain Analyst",
          weight: 0.4,
          rawScore: 10,
          weighted: 4,
          rationale: "",
        },
      ],
    });
    const nftSummary = buildExecutiveSummary({
      entityLabel: "Luminar Genesis",
      entityType: "nft_collection",
      score: 17,
      confidence: 62,
      riskLabel: "Promising",
      topFindings: [],
      scoreBreakdown: [
        {
          agent: "NFT Sentinel",
          weight: 0.45,
          rawScore: 17,
          weighted: 7.65,
          rationale: "",
        },
      ],
    });
    // Both clean → "No risk signals detected on this {noun}. …"
    expect(walletSummary.toLowerCase()).toContain("no risk signals detected");
    expect(walletSummary.toLowerCase()).toContain("wallet");
    expect(nftSummary.toLowerCase()).toContain("no risk signals detected");
    expect(nftSummary.toLowerCase()).toContain("collection");
  });

  it("distinguishes token from wallet and collection via the entity noun", () => {
    const tokenSummary = buildExecutiveSummary({
      entityLabel: "SALPHA",
      entityType: "token",
      score: 12,
      confidence: 72,
      riskLabel: "Promising",
      topFindings: [],
      scoreBreakdown: [],
    });
    expect(tokenSummary.toLowerCase()).toContain("no risk signals detected");
    expect(tokenSummary.toLowerCase()).toContain("token");
  });

  it("uses decisive wording for Neutral risk band", () => {
    const summary = buildExecutiveSummary({
      entityLabel: "Night Circuit Club",
      entityType: "nft_collection",
      score: 42,
      confidence: 60,
      riskLabel: "Neutral",
      topFindings: [f({ title: "Wash-trade signature", severity: "high" })],
      scoreBreakdown: [],
    });
    expect(summary.toLowerCase()).toContain("mixed signals");
    expect(summary.toLowerCase()).toContain("collection");
    expect(summary.toLowerCase()).toContain("wash-trade signature");
    expect(summary.toLowerCase()).toContain("maintain active monitoring");
  });

  it("uses 'elevated risk identified' wording for Elevated Risk band", () => {
    const summary = buildExecutiveSummary({
      entityLabel: "Fresh Wallet",
      entityType: "wallet",
      score: 64,
      confidence: 59,
      riskLabel: "Elevated Risk",
      topFindings: [f({ title: "Mixer-linked funding detected", severity: "high" })],
      scoreBreakdown: [],
    });
    expect(summary.toLowerCase()).toContain("elevated risk identified");
    expect(summary.toLowerCase()).toContain("wallet");
    expect(summary.toLowerCase()).toContain("mixer-linked funding");
    expect(summary.toLowerCase()).toContain("reduce exposure");
    // Filler word "detected" should be stripped from the driver phrase
    expect(summary.toLowerCase()).not.toContain("detected");
  });

  it("switches to preliminary wording when confidence is below 35", () => {
    const summary = buildExecutiveSummary({
      entityLabel: "Unknown",
      entityType: "token",
      score: 90,
      confidence: 20,
      riskLabel: "Under Review",
      topFindings: [f({ title: "Thin liquidity", severity: "high" })],
      scoreBreakdown: [],
    });
    expect(summary.toLowerCase()).toContain("preliminary assessment");
    expect(summary.toLowerCase()).toContain("broader data");
    // Preliminary is cautious — no alarm, no "high risk identified"
    expect(summary.toLowerCase()).not.toContain("high risk identified");
  });

  it("handles the empty-driver edge case without crashing", () => {
    const summary = buildExecutiveSummary({
      entityLabel: "Empty",
      entityType: "wallet",
      score: 0,
      confidence: 60,
      riskLabel: "Promising",
      topFindings: [],
      scoreBreakdown: [],
    });
    expect(summary.toLowerCase()).toContain("no risk signals detected");
    expect(summary.toLowerCase()).toContain("wallet");
  });
});

// ---------- buildWhyThisMatters ----------

describe("normalize — buildWhyThisMatters", () => {
  it("produces a severe-signals paragraph for score >= 70", () => {
    const text = buildWhyThisMatters({
      score: 85,
      confidence: 70,
      conflicts: [],
      topFindings: [f({ title: "Honeypot", severity: "critical" })],
    });
    expect(text.toLowerCase()).toContain("severe signals");
    expect(text.toLowerCase()).toContain("1 critical finding");
  });

  it("surfaces the dominant contributor when the breakdown has real weight", () => {
    const text = buildWhyThisMatters({
      score: 85,
      confidence: 70,
      conflicts: [],
      topFindings: [],
      scoreBreakdown: [
        {
          agent: "Token Risk",
          weight: 0.45,
          rawScore: 90,
          weighted: 40.5,
          rationale: "",
        },
      ],
    });
    expect(text.toLowerCase()).toContain("token risk");
    expect(text.toLowerCase()).toContain("drives the profile");
  });

  it("appends a confidence warning when below 50", () => {
    const text = buildWhyThisMatters({
      score: 40,
      confidence: 30,
      conflicts: [],
      topFindings: [],
    });
    expect(text.toLowerCase()).toContain("below 50%");
  });

  it("narrates conflicts instead of exposing raw contradictions", () => {
    const conflicts: Conflict[] = [
      {
        id: "c1",
        agents: ["Social Signal", "Pattern Detection"],
        description: "Social vs pattern",
        resolution: "pattern wins",
        confidencePenalty: 6,
      },
    ];
    const text = buildWhyThisMatters({
      score: 50,
      confidence: 60,
      conflicts,
      topFindings: [],
    });
    expect(text.toLowerCase()).toContain("disagreement");
    expect(text.toLowerCase()).toContain("both views preserved");
    // It should NOT expose the raw Conflict object:
    expect(text).not.toContain("[object Object]");
  });

  it("produces a calm paragraph when the score is below 40", () => {
    const text = buildWhyThisMatters({
      score: 20,
      confidence: 80,
      conflicts: [],
      topFindings: [],
    });
    expect(text.toLowerCase()).toContain("low score");
  });
});

// ---------- normalizeInvestigation ----------

describe("normalize — normalizeInvestigation (integration)", () => {
  it("returns a new object without mutating the input", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const before = JSON.stringify(inv);
    const normalized = normalizeInvestigation(inv);
    const after = JSON.stringify(inv);
    expect(after).toBe(before);
    expect(normalized).not.toBe(inv);
  });

  it("leaves agent outputs untouched so the Agent Activity panel still renders the raw trail", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const normalized = normalizeInvestigation(inv);
    expect(normalized.agentOutputs.length).toBe(inv.agentOutputs.length);
    expect(normalized.agentOutputs.map((o) => o.agentName)).toEqual(
      inv.agentOutputs.map((o) => o.agentName),
    );
  });

  it("produces a consistent executive summary shape across wallet / token / NFT", () => {
    const wallet = investigate({ identifier: "Whale 042" });
    const token = investigate({ identifier: "MoonPaw Inu" });
    const nft = investigate({ identifier: "Luminar Genesis" });
    for (const inv of [wallet, token, nft]) {
      // 1–2 sentences, under 300 chars, no numeric clutter
      expect(inv.executiveSummary.length).toBeLessThan(300);
      expect(inv.executiveSummary).not.toMatch(/\/100/);
      expect(inv.executiveSummary).not.toMatch(/confidence \d+%/);
      // Ends with a period
      expect(inv.executiveSummary.trimEnd().endsWith(".")).toBe(true);
      // At most 2 sentences
      const sentences = inv.executiveSummary.split(/\.\s+/).filter(Boolean);
      expect(sentences.length).toBeLessThanOrEqual(2);
    }
  });

  it("uses the correct entity noun in each summary", () => {
    const wallet = investigate({ identifier: "Whale 042" });
    const token = investigate({ identifier: "SALPHA" });
    const nft = investigate({ identifier: "Luminar Genesis" });
    expect(wallet.executiveSummary.toLowerCase()).toContain("wallet");
    expect(token.executiveSummary.toLowerCase()).toContain("token");
    expect(nft.executiveSummary.toLowerCase()).toContain("collection");
  });

  it("top findings are always ≤ 12 items and sorted most-severe-first", () => {
    const cases = ["Whale 042", "Fresh Wallet 01", "MoonPaw Inu", "Night Circuit Club"];
    for (const id of cases) {
      const inv = investigate({ identifier: id });
      expect(inv.topFindings.length).toBeLessThanOrEqual(12);
      for (let i = 1; i < inv.topFindings.length; i++) {
        const prev = inv.topFindings[i - 1];
        const curr = inv.topFindings[i];
        const rank: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
          info: 0,
        };
        expect(rank[prev.severity]).toBeGreaterThanOrEqual(rank[curr.severity]);
      }
    }
  });

  it("adapter output contains only noise-reduced alerts", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const report = investigationToReport(inv);
    const levels = new Set(report.alerts.map((a) => a.severity));
    // reduceAlertNoise drops info and low
    expect(levels.has("info")).toBe(false);
    expect(levels.has("low")).toBe(false);
  });

  it("adapter alerts are deduped relative to raw agent outputs", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const rawAlertCount = inv.agentOutputs.flatMap((o) => o.alerts).length;
    const report = investigationToReport(inv);
    expect(report.alerts.length).toBeLessThanOrEqual(rawAlertCount);
  });

  it("CommandBrain auto-applies normalization so investigate() returns the decision-grade shape", () => {
    const inv = defaultCommandBrain.investigate({ identifier: "Fresh Wallet 01" });
    // Decision-grade prose: noun present, driver present, no hedging,
    // no numeric clutter, answers "what should I do?".
    expect(inv.executiveSummary.toLowerCase()).toContain("wallet");
    expect(inv.executiveSummary.toLowerCase()).toContain("mixer");
    expect(inv.executiveSummary.toLowerCase()).toMatch(/reduce exposure|do not hold/);
    expect(inv.executiveSummary).not.toMatch(/\/100/);
    expect(inv.executiveSummary).not.toMatch(/confidence \d+%/);
    expect(inv.executiveSummary.toLowerCase()).not.toMatch(
      /\bmight\b|\bcould\b|\bpossibly\b|\bappears\b/,
    );
  });

  it("normalization is idempotent — normalizing a normalized report is a no-op", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const twice = normalizeInvestigation(normalizeInvestigation(inv));
    expect(twice.executiveSummary).toBe(inv.executiveSummary);
    expect(twice.whyThisMatters).toBe(inv.whyThisMatters);
    expect(twice.topFindings.length).toBe(inv.topFindings.length);
  });

  it("every field documented in the Investigation type is still populated after normalization", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    // Required fields
    expect(inv.id).toBeTruthy();
    expect(inv.entity).toBeTruthy();
    expect(inv.entityType).toBeTruthy();
    expect(inv.startedAt).toBeTruthy();
    expect(inv.completedAt).toBeTruthy();
    expect(inv.participatingAgents.length).toBeGreaterThan(0);
    expect(typeof inv.overallRiskScore).toBe("number");
    expect(typeof inv.overallConfidence.value).toBe("number");
    expect(typeof inv.overallConfidence.rationale).toBe("string");
    expect(inv.riskLabel).toBeTruthy();
    expect(inv.trendDirection).toBeTruthy();
    expect(inv.executiveSummary).toBeTruthy();
    expect(inv.whyThisMatters).toBeTruthy();
    expect(Array.isArray(inv.topFindings)).toBe(true);
    expect(inv.alertSummary).toBeTruthy();
    expect(Array.isArray(inv.scoreBreakdown)).toBe(true);
    expect(Array.isArray(inv.agentOutputs)).toBe(true);
    expect(Array.isArray(inv.recommendations)).toBe(true);
    expect(Array.isArray(inv.limitations)).toBe(true);
    expect(Array.isArray(inv.conflicts)).toBe(true);
    expect(Array.isArray(inv.log)).toBe(true);
  });

  it("wallet / token / NFT outputs share the same field set for data consistency", () => {
    const wallet = investigate({ identifier: "Whale 042" });
    const token = investigate({ identifier: "MoonPaw Inu" });
    const nft = investigate({ identifier: "Luminar Genesis" });
    const walletKeys = Object.keys(wallet).sort();
    const tokenKeys = Object.keys(token).sort();
    const nftKeys = Object.keys(nft).sort();
    expect(tokenKeys).toEqual(walletKeys);
    expect(nftKeys).toEqual(walletKeys);
  });
});

// ---------- end-to-end: the legacy IntelligenceReport consumed by the UI ----------

describe("normalize — legacy IntelligenceReport output", () => {
  it("executiveSummary is sharp, driver-led, and under 300 chars", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const report = investigationToReport(inv);
    expect(report.executiveSummary.length).toBeLessThan(300);
    expect(report.executiveSummary.toLowerCase()).toContain("high risk identified");
    expect(report.executiveSummary.toLowerCase()).toContain("token");
    expect(report.executiveSummary.toLowerCase()).toMatch(
      /mint authority|thin liquidity|honeypot/,
    );
    // Decision-grade: directive present, no hedging
    expect(report.executiveSummary.toLowerCase()).toContain(
      "do not hold exposure",
    );
    expect(report.executiveSummary.toLowerCase()).not.toMatch(
      /\bmight\b|\bcould\b|\bpossibly\b/,
    );
  });

  it("every analysis output is free of hedging language", () => {
    const cases = ["Whale 042", "Fresh Wallet 01", "MoonPaw Inu", "Luminar Genesis", "Night Circuit Club"];
    for (const id of cases) {
      const inv = investigate({ identifier: id });
      const report = investigationToReport(inv);
      // Summaries and why-this-matters are decision-grade
      const corpus =
        report.executiveSummary + " " + report.whyThisMatters;
      expect(corpus.toLowerCase()).not.toMatch(
        /\bmight be\b|\bmay be\b|\bcould be\b|\bpossibly\b|\bperhaps\b|\bworth attention\b/,
      );
      // And so is every agent summary surfaced to the UI
      for (const ao of report.agentOutputs) {
        expect(ao.summary.toLowerCase()).not.toMatch(
          /\bappears\s+(consistent|healthy|operational)/,
        );
        expect(ao.summary.toLowerCase()).not.toMatch(
          /\blooks\s+(substantive|consistent|clean)/,
        );
      }
    }
  });

  it("legacy alerts carry rewritten (clean) titles", () => {
    const inv = investigate({ identifier: "Night Circuit Club" });
    const report = investigationToReport(inv);
    for (const alert of report.alerts) {
      // Rewritten titles never contain hedging or trailing verbs
      expect(alert.title.toLowerCase()).not.toContain("heuristic triggered");
      expect(alert.title.toLowerCase()).not.toMatch(/^possible /);
    }
  });

  it("findings list is bounded and prioritized", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const report = investigationToReport(inv);
    expect(report.findings.length).toBeLessThanOrEqual(12);
    // first finding is highest severity
    const rank: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      info: 0,
    };
    if (report.findings.length >= 2) {
      expect(rank[report.findings[0].severity]).toBeGreaterThanOrEqual(
        rank[report.findings[1].severity],
      );
    }
  });

  it("conflicts are exposed as narrative strings, never raw objects", () => {
    const inv = investigate({ identifier: "MoonPaw Inu" });
    const report = investigationToReport(inv);
    for (const c of report.conflicts) {
      expect(typeof c).toBe("string");
      expect(c).not.toContain("[object Object]");
    }
  });

  it("all three entity types produce the same top-level shape for UI consumption", () => {
    const wallet = investigationToReport(investigate({ identifier: "Whale 042" }));
    const token = investigationToReport(investigate({ identifier: "MoonPaw Inu" }));
    const nft = investigationToReport(investigate({ identifier: "Luminar Genesis" }));
    const walletKeys = Object.keys(wallet).sort();
    const tokenKeys = Object.keys(token).sort();
    const nftKeys = Object.keys(nft).sort();
    expect(tokenKeys).toEqual(walletKeys);
    expect(nftKeys).toEqual(walletKeys);
  });
});
