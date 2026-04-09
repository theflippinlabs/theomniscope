import { beforeEach, describe, expect, it } from "vitest";
import {
  compareAnalysis,
  detectActivitySpike,
  detectChanges,
  detectConfidenceMovement,
  detectLiveChanges,
  detectNewFindings,
  detectResolvedFindings,
  detectScoreChange,
  detectSeverityEscalations,
  detectVerdictShift,
  diffFindings,
  generateChangeSummary,
  generateSignal,
  monitorEntity,
  monitorInvestigation,
  type Signal,
} from "@/lib/signals";
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
    id: overrides.id ?? "entry-x",
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

// ---------- detectScoreChange ----------

describe("signals — detectScoreChange", () => {
  it("returns null when the delta is below the minor threshold", () => {
    const prev = buildEntry({ riskScore: 40 });
    const curr = buildEntry({ riskScore: 43 });
    expect(detectScoreChange(prev, curr)).toBeNull();
  });

  it("flags a deteriorating minor change as low severity", () => {
    const prev = buildEntry({ riskScore: 40 });
    const curr = buildEntry({ riskScore: 47 });
    const s = detectScoreChange(prev, curr)!;
    expect(s).toBeTruthy();
    expect(s.kind).toBe("score_change");
    expect(s.direction).toBe("deteriorating");
    expect(s.magnitude).toBe(7);
    expect(s.severity).toBe("low");
  });

  it("flags a major deteriorating change as high severity", () => {
    const prev = buildEntry({ riskScore: 40 });
    const curr = buildEntry({ riskScore: 70 });
    const s = detectScoreChange(prev, curr)!;
    expect(s.severity).toBe("high");
    expect(s.magnitude).toBe(30);
    expect(s.title.toLowerCase()).toContain("climbed");
  });

  it("flags an improving change with the improving direction", () => {
    const prev = buildEntry({ riskScore: 70 });
    const curr = buildEntry({ riskScore: 40 });
    const s = detectScoreChange(prev, curr)!;
    expect(s.direction).toBe("improving");
    expect(s.severity).toBe("info");
    expect(s.title.toLowerCase()).toContain("improved");
  });
});

// ---------- detectVerdictShift ----------

describe("signals — detectVerdictShift", () => {
  it("returns null when the verdict is unchanged", () => {
    const a = buildEntry({ verdict: "caution" });
    const b = buildEntry({ verdict: "caution" });
    expect(detectVerdictShift(a, b)).toBeNull();
  });

  it("flags an escalation to avoid as critical", () => {
    const prev = buildEntry({ verdict: "caution" });
    const curr = buildEntry({ verdict: "avoid" });
    const s = detectVerdictShift(prev, curr)!;
    expect(s.severity).toBe("critical");
    expect(s.direction).toBe("deteriorating");
    expect(s.title.toLowerCase()).toContain("escalated");
  });

  it("flags a de-escalation to safe as an info improvement", () => {
    const prev = buildEntry({ verdict: "caution" });
    const curr = buildEntry({ verdict: "safe" });
    const s = detectVerdictShift(prev, curr)!;
    expect(s.severity).toBe("info");
    expect(s.direction).toBe("improving");
    expect(s.title.toLowerCase()).toContain("de-escalated");
  });
});

// ---------- diffFindings ----------

describe("signals — diffFindings", () => {
  it("buckets findings into new / resolved / persisting / escalations", () => {
    const prev = buildEntry({
      keyFindings: [
        finding("Low liquidity", "medium"),
        finding("Mutable taxes", "high"),
        finding("Old thing", "high"),
      ],
    });
    const curr = buildEntry({
      keyFindings: [
        finding("Low liquidity", "medium"), // persisting
        finding("Mutable taxes", "critical"), // escalated
        finding("Honeypot", "critical"), // new
      ],
    });

    const { newFindings, resolvedFindings, persistingFindings, escalations } =
      diffFindings(prev, curr);

    expect(newFindings.map((f) => f.title)).toEqual(["Honeypot"]);
    expect(resolvedFindings.map((f) => f.title)).toEqual(["Old thing"]);
    expect(persistingFindings.map((f) => f.title)).toEqual(["Low liquidity"]);
    expect(escalations).toHaveLength(1);
    expect(escalations[0].previous.severity).toBe("high");
    expect(escalations[0].current.severity).toBe("critical");
  });

  it("handles title casing and whitespace gracefully", () => {
    const prev = buildEntry({ keyFindings: [finding("Mixer Funding", "high")] });
    const curr = buildEntry({ keyFindings: [finding("  mixer funding  ", "high")] });
    const d = diffFindings(prev, curr);
    expect(d.newFindings).toEqual([]);
    expect(d.resolvedFindings).toEqual([]);
    expect(d.persistingFindings).toHaveLength(1);
  });
});

// ---------- detectNewFindings / detectResolvedFindings / detectSeverityEscalations ----------

describe("signals — per-finding detectors", () => {
  it("detectNewFindings emits one deteriorating signal per new finding", () => {
    const prev = buildEntry({ keyFindings: [] });
    const curr = buildEntry({
      keyFindings: [
        finding("Honeypot", "critical"),
        finding("Mint authority", "high"),
      ],
    });
    const signals = detectNewFindings(prev, curr);
    expect(signals).toHaveLength(2);
    expect(signals[0].direction).toBe("deteriorating");
    expect(signals[0].kind).toBe("new_finding");
    expect(signals[0].title.toLowerCase()).toContain("new finding");
    const severities = signals.map((s) => s.severity);
    expect(severities).toContain("critical");
    expect(severities).toContain("high");
  });

  it("detectResolvedFindings only celebrates high/critical resolutions", () => {
    const prev = buildEntry({
      keyFindings: [
        finding("Thin liquidity", "high"),
        finding("Wallet young", "medium"),
      ],
    });
    const curr = buildEntry({ keyFindings: [] });
    const signals = detectResolvedFindings(prev, curr);
    // Only the high one is celebrated
    expect(signals).toHaveLength(1);
    expect(signals[0].direction).toBe("improving");
    expect(signals[0].title.toLowerCase()).toContain("resolved");
    expect(signals[0].title.toLowerCase()).toContain("thin liquidity");
  });

  it("detectSeverityEscalations fires when an existing finding gets worse", () => {
    const prev = buildEntry({
      keyFindings: [finding("Mutable taxes", "medium")],
    });
    const curr = buildEntry({
      keyFindings: [finding("Mutable taxes", "critical")],
    });
    const signals = detectSeverityEscalations(prev, curr);
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("severity_escalation");
    expect(signals[0].direction).toBe("deteriorating");
    expect(signals[0].title.toLowerCase()).toContain("mutable taxes");
  });
});

// ---------- detectConfidenceMovement ----------

describe("signals — detectConfidenceMovement", () => {
  it("ignores small confidence changes", () => {
    const a = buildEntry({ confidenceScore: 70 });
    const b = buildEntry({ confidenceScore: 75 });
    expect(detectConfidenceMovement(a, b)).toBeNull();
  });

  it("emits a confidence_drop signal when confidence falls by ≥ 10", () => {
    const a = buildEntry({ confidenceScore: 80 });
    const b = buildEntry({ confidenceScore: 55 });
    const s = detectConfidenceMovement(a, b)!;
    expect(s.kind).toBe("confidence_drop");
    expect(s.severity).toBe("medium");
    expect(s.direction).toBe("deteriorating");
    expect(s.magnitude).toBe(25);
  });

  it("emits a confidence_recovery signal when confidence rises by ≥ 10", () => {
    const a = buildEntry({ confidenceScore: 50 });
    const b = buildEntry({ confidenceScore: 80 });
    const s = detectConfidenceMovement(a, b)!;
    expect(s.kind).toBe("confidence_recovery");
    expect(s.severity).toBe("info");
    expect(s.direction).toBe("improving");
  });
});

// ---------- detectActivitySpike ----------

describe("signals — detectActivitySpike", () => {
  it("returns null when high/critical count is stable", () => {
    const a = buildEntry({ keyFindings: [finding("A", "high")] });
    const b = buildEntry({ keyFindings: [finding("A", "high")] });
    expect(detectActivitySpike(a, b)).toBeNull();
  });

  it("fires when high/critical count jumps by ≥ 2", () => {
    const a = buildEntry({ keyFindings: [finding("A", "high")] });
    const b = buildEntry({
      keyFindings: [
        finding("A", "high"),
        finding("B", "high"),
        finding("C", "critical"),
      ],
    });
    const s = detectActivitySpike(a, b)!;
    expect(s).toBeTruthy();
    expect(s.kind).toBe("activity_spike");
    expect(s.severity).toBe("high");
    expect(s.direction).toBe("deteriorating");
  });
});

// ---------- detectChanges (composition) ----------

describe("signals — detectChanges composition", () => {
  it("returns all signals sorted by magnitude descending", () => {
    const prev = buildEntry({
      riskScore: 30,
      confidenceScore: 80,
      verdict: "safe",
      keyFindings: [finding("Calm baseline", "low")],
    });
    const curr = buildEntry({
      riskScore: 85,
      confidenceScore: 55,
      verdict: "avoid",
      keyFindings: [
        finding("Honeypot", "critical"),
        finding("Mint authority", "high"),
        finding("Thin liquidity", "high"),
      ],
    });
    const signals = detectChanges(prev, curr);
    // Must include score, verdict, 3 new findings, confidence drop
    const kinds = signals.map((s) => s.kind);
    expect(kinds).toContain("score_change");
    expect(kinds).toContain("verdict_shift");
    expect(kinds).toContain("new_finding");
    expect(kinds).toContain("confidence_drop");
    // Sorted by magnitude descending
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i - 1].magnitude).toBeGreaterThanOrEqual(signals[i].magnitude);
    }
  });

  it("returns an empty list when nothing material has changed", () => {
    const a = buildEntry();
    const b = buildEntry();
    const signals = detectChanges(a, b);
    expect(signals).toEqual([]);
  });
});

// ---------- generateSignal factory ----------

describe("signals — generateSignal factory", () => {
  it("produces a Signal with id and detectedAt attached", () => {
    const s: Signal = generateSignal({
      kind: "score_change",
      severity: "medium",
      title: "Test",
      description: "Test description",
      direction: "deteriorating",
      magnitude: 50,
      entity: { identifier: "x", label: "x", type: "token" },
      current: {
        timestamp: "2026-04-01T00:00:00Z",
        riskScore: 50,
        confidenceScore: 70,
        verdict: "caution",
      },
    });
    expect(s.id).toMatch(/^sig_/);
    expect(s.detectedAt).toBeTruthy();
    expect(s.kind).toBe("score_change");
  });
});

// ---------- generateChangeSummary ----------

describe("signals — generateChangeSummary", () => {
  it("returns a first-observation narrative when prev is null", () => {
    const curr = buildEntry({ verdict: "avoid" });
    const s = generateChangeSummary(null, curr, []);
    expect(s.narrative.toLowerCase()).toContain("first analysis");
    expect(s.previousVerdict).toBeUndefined();
    expect(s.currentVerdict).toBe("avoid");
    expect(s.significantChange).toBe(false);
  });

  it("emits a no-change narrative when no signals surfaced", () => {
    const a = buildEntry();
    const b = buildEntry();
    const s = generateChangeSummary(a, b, []);
    expect(s.narrative.toLowerCase()).toContain("no material change");
    expect(s.significantChange).toBe(false);
  });

  it("marks the change as significant when a high/critical signal is present", () => {
    const prev = buildEntry({ riskScore: 30, verdict: "safe" });
    const curr = buildEntry({ riskScore: 80, verdict: "avoid" });
    const signals = detectChanges(prev, curr);
    const s = generateChangeSummary(prev, curr, signals);
    expect(s.significantChange).toBe(true);
    expect(s.overallDirection).toBe("deteriorating");
    expect(s.narrative.toLowerCase()).toContain("avoid");
  });

  it("narrates an improving trajectory when signals are mostly improving", () => {
    const prev = buildEntry({ riskScore: 80, verdict: "avoid" });
    const curr = buildEntry({ riskScore: 30, verdict: "safe" });
    const signals = detectChanges(prev, curr);
    const s = generateChangeSummary(prev, curr, signals);
    expect(s.overallDirection).toBe("improving");
  });
});

// ---------- compareAnalysis ----------

describe("signals — compareAnalysis", () => {
  it("handles the first-observation case (null previous)", () => {
    const curr = buildEntry({ keyFindings: [finding("X", "high")] });
    const result = compareAnalysis(null, curr);
    expect(result.previous).toBeNull();
    expect(result.deltaScore).toBe(0);
    expect(result.verdictChanged).toBe(false);
    expect(result.newFindings).toHaveLength(1);
    expect(result.signals).toEqual([]);
    expect(result.summary.narrative.toLowerCase()).toContain("first analysis");
  });

  it("returns a full comparison result with deltas and signals", () => {
    const prev = buildEntry({
      riskScore: 30,
      confidenceScore: 75,
      verdict: "safe",
      keyFindings: [],
    });
    const curr = buildEntry({
      riskScore: 82,
      confidenceScore: 55,
      verdict: "avoid",
      keyFindings: [finding("Honeypot", "critical")],
    });
    const result = compareAnalysis(prev, curr);
    expect(result.deltaScore).toBe(52);
    expect(result.deltaConfidence).toBe(-20);
    expect(result.verdictChanged).toBe(true);
    expect(result.newFindings).toHaveLength(1);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.summary.significantChange).toBe(true);
    expect(result.summary.overallDirection).toBe("deteriorating");
  });
});

// ---------- live monitoring (memory integration) ----------

describe("signals — monitorEntity / monitorInvestigation", () => {
  it("returns a first-observation result when no history exists", async () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    const result = await monitorInvestigation(inv);
    expect(result.previous).toBeNull();
    expect(result.signals).toEqual([]);
    expect(result.summary.narrative.toLowerCase()).toContain("first analysis");
  });

  it("compares against the most recent stored entry when history exists", async () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    await saveAnalysis(inv);
    // Pretend the current score is lower (manual entry to force improvement)
    const current = buildEntry({
      entity: inv.entity
        ? {
            identifier: inv.entity.identifier,
            label: inv.entity.label,
            type: inv.entityType,
          }
        : { identifier: "0xabc", label: "x", type: "token" },
      riskScore: 30,
      confidenceScore: 75,
      verdict: "safe",
      riskLabel: "Promising",
    });
    const result = await monitorEntity(current);
    expect(result.previous).toBeTruthy();
    expect(result.deltaScore).toBeLessThan(0); // improved
    expect(result.verdictChanged).toBe(true);
    expect(result.summary.overallDirection).toBe("improving");
  });

  it("detectLiveChanges returns a flat list of signals", async () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    await saveAnalysis(inv);
    const current = buildEntry({
      entity: {
        identifier: inv.entity.identifier,
        label: inv.entity.label,
        type: inv.entityType,
      },
      riskScore: 10,
      confidenceScore: 85,
      verdict: "safe",
      riskLabel: "Promising",
    });
    const signals = await detectLiveChanges(current);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => typeof s.magnitude === "number")).toBe(true);
  });
});
