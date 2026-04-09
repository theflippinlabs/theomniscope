/**
 * Detection helpers.
 *
 * Each function takes a previous and current `MemoryEntry` and
 * returns either a single `Signal` (or `null` for "no signal") or an
 * array. The top-level `detectChanges` composes all detectors into a
 * single signal list for downstream consumers.
 *
 * Thresholds are deliberately conservative: small fluctuations are
 * filtered out so the signal stream stays high-signal.
 */

import type { Severity } from "../oracle/engine/types";
import type { KeyFinding, MemoryEntry, MemoryVerdict } from "../memory/types";
import { generateSignal } from "./generate";
import type { Signal, SignalDirection } from "./types";

// ---------- thresholds ----------

const SCORE_MINOR = 5;
const SCORE_MODERATE = 10;
const SCORE_MAJOR = 20;
const CONFIDENCE_THRESHOLD = 10;
const ACTIVITY_SPIKE_THRESHOLD = 2; // net delta in high/critical count

// ---------- helpers ----------

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const VERDICT_RANK: Record<MemoryVerdict, number> = {
  safe: 0,
  preliminary: 1,
  caution: 2,
  avoid: 3,
};

function snapRef(e: MemoryEntry) {
  return {
    timestamp: e.timestamp,
    riskScore: e.riskScore,
    confidenceScore: e.confidenceScore,
    verdict: e.verdict,
  };
}

function findingKey(f: KeyFinding): string {
  return f.title.trim().toLowerCase();
}

// ---------- score change ----------

export function detectScoreChange(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal | null {
  const delta = curr.riskScore - prev.riskScore;
  const magnitude = Math.abs(delta);
  if (magnitude < SCORE_MINOR) return null;

  const direction: SignalDirection = delta > 0 ? "deteriorating" : "improving";
  const isBad = direction === "deteriorating";

  const severity: Severity =
    magnitude >= SCORE_MAJOR
      ? isBad ? "high" : "info"
      : magnitude >= SCORE_MODERATE
        ? isBad ? "medium" : "low"
        : isBad ? "low" : "info";

  const title = isBad
    ? `Risk score climbed by ${magnitude} points`
    : `Risk score improved by ${magnitude} points`;

  const description = isBad
    ? `${curr.entity.label} moved from ${prev.riskScore} to ${curr.riskScore}. Deteriorating trajectory — investigate the new drivers.`
    : `${curr.entity.label} moved from ${prev.riskScore} to ${curr.riskScore}. Improving trajectory — monitor for stability.`;

  return generateSignal({
    kind: "score_change",
    severity,
    title,
    description,
    direction,
    magnitude,
    entity: { ...curr.entity },
    previous: snapRef(prev),
    current: snapRef(curr),
  });
}

// ---------- verdict shift ----------

export function detectVerdictShift(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal | null {
  if (prev.verdict === curr.verdict) return null;
  const deteriorating = VERDICT_RANK[curr.verdict] > VERDICT_RANK[prev.verdict];
  const direction: SignalDirection = deteriorating ? "deteriorating" : "improving";

  const severity: Severity =
    curr.verdict === "avoid"
      ? "critical"
      : curr.verdict === "caution"
        ? "high"
        : curr.verdict === "preliminary"
          ? "medium"
          : "info";

  const title = deteriorating
    ? `Verdict escalated: ${prev.verdict} → ${curr.verdict}`
    : `Verdict de-escalated: ${prev.verdict} → ${curr.verdict}`;

  const description = deteriorating
    ? `${curr.entity.label} escalated from ${prev.verdict} to ${curr.verdict}. Review the latest analysis before any action.`
    : `${curr.entity.label} de-escalated from ${prev.verdict} to ${curr.verdict}. Risk signals resolving.`;

  return generateSignal({
    kind: "verdict_shift",
    severity,
    title,
    description,
    direction,
    magnitude: Math.abs(VERDICT_RANK[curr.verdict] - VERDICT_RANK[prev.verdict]) * 25,
    entity: { ...curr.entity },
    previous: snapRef(prev),
    current: snapRef(curr),
  });
}

// ---------- findings diff ----------

export interface FindingsDiff {
  newFindings: KeyFinding[];
  resolvedFindings: KeyFinding[];
  persistingFindings: KeyFinding[];
  escalations: Array<{ previous: KeyFinding; current: KeyFinding }>;
}

/**
 * Compare two key-findings sets and return new, resolved, persisting,
 * and escalated buckets. Escalations are findings with the same title
 * but a higher severity in `curr` than in `prev`.
 */
export function diffFindings(
  prev: MemoryEntry,
  curr: MemoryEntry,
): FindingsDiff {
  const prevByTitle = new Map<string, KeyFinding>();
  for (const f of prev.keyFindings) prevByTitle.set(findingKey(f), f);

  const currByTitle = new Map<string, KeyFinding>();
  for (const f of curr.keyFindings) currByTitle.set(findingKey(f), f);

  const newFindings: KeyFinding[] = [];
  const resolvedFindings: KeyFinding[] = [];
  const persistingFindings: KeyFinding[] = [];
  const escalations: Array<{ previous: KeyFinding; current: KeyFinding }> = [];

  for (const [key, cf] of currByTitle) {
    const pf = prevByTitle.get(key);
    if (!pf) {
      newFindings.push(cf);
    } else if (SEVERITY_RANK[cf.severity] > SEVERITY_RANK[pf.severity]) {
      escalations.push({ previous: pf, current: cf });
    } else {
      persistingFindings.push(cf);
    }
  }

  for (const [key, pf] of prevByTitle) {
    if (!currByTitle.has(key)) resolvedFindings.push(pf);
  }

  return { newFindings, resolvedFindings, persistingFindings, escalations };
}

// ---------- new findings ----------

export function detectNewFindings(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal[] {
  const { newFindings } = diffFindings(prev, curr);
  return newFindings.map((f) => {
    const severity: Severity = f.severity === "info" ? "low" : f.severity;
    const magnitude =
      severity === "critical" ? 85
      : severity === "high" ? 65
      : severity === "medium" ? 45
      : 25;
    return generateSignal({
      kind: "new_finding",
      severity,
      title: `New finding: ${f.title}`,
      description: `${curr.entity.label} now surfaces a ${f.severity} finding — ${f.title} (${f.category}).`,
      direction: "deteriorating",
      magnitude,
      entity: { ...curr.entity },
      previous: snapRef(prev),
      current: snapRef(curr),
    });
  });
}

// ---------- resolved findings ----------

export function detectResolvedFindings(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal[] {
  const { resolvedFindings } = diffFindings(prev, curr);
  // Only celebrate the resolution of high/critical findings — losing a
  // medium finding from the top-5 list is not newsworthy.
  return resolvedFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .map((f) =>
      generateSignal({
        kind: "resolved_finding",
        severity: "info",
        title: `Resolved: ${f.title}`,
        description: `${curr.entity.label} no longer surfaces the ${f.severity} finding — ${f.title} (${f.category}).`,
        direction: "improving",
        magnitude: 45,
        entity: { ...curr.entity },
        previous: snapRef(prev),
        current: snapRef(curr),
      }),
    );
}

// ---------- severity escalation ----------

export function detectSeverityEscalations(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal[] {
  const { escalations } = diffFindings(prev, curr);
  return escalations.map(({ previous, current }) => {
    const severity: Severity = current.severity === "info" ? "low" : current.severity;
    return generateSignal({
      kind: "severity_escalation",
      severity,
      title: `Escalated: ${current.title} (${previous.severity} → ${current.severity})`,
      description: `${curr.entity.label} sees ${current.title} escalate from ${previous.severity} to ${current.severity}.`,
      direction: "deteriorating",
      magnitude:
        (SEVERITY_RANK[current.severity] - SEVERITY_RANK[previous.severity]) * 25 + 20,
      entity: { ...curr.entity },
      previous: snapRef(prev),
      current: snapRef(curr),
    });
  });
}

// ---------- confidence movement ----------

export function detectConfidenceMovement(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal | null {
  const delta = curr.confidenceScore - prev.confidenceScore;
  const magnitude = Math.abs(delta);
  if (magnitude < CONFIDENCE_THRESHOLD) return null;

  const dropping = delta < 0;
  return generateSignal({
    kind: dropping ? "confidence_drop" : "confidence_recovery",
    severity: dropping ? "medium" : "info",
    title: dropping
      ? `Confidence dropped by ${magnitude} points`
      : `Confidence recovered by ${magnitude} points`,
    description: dropping
      ? `Analysis confidence fell from ${prev.confidenceScore}% to ${curr.confidenceScore}%. Coverage or agent availability degraded.`
      : `Analysis confidence rose from ${prev.confidenceScore}% to ${curr.confidenceScore}%. Additional coverage improved the signal.`,
    direction: dropping ? "deteriorating" : "improving",
    magnitude,
    entity: { ...curr.entity },
    previous: snapRef(prev),
    current: snapRef(curr),
  });
}

// ---------- activity spike ----------

export function detectActivitySpike(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal | null {
  const prevHigh = prev.keyFindings.filter(
    (f) => f.severity === "high" || f.severity === "critical",
  ).length;
  const currHigh = curr.keyFindings.filter(
    (f) => f.severity === "high" || f.severity === "critical",
  ).length;
  const delta = currHigh - prevHigh;
  if (delta < ACTIVITY_SPIKE_THRESHOLD) return null;

  return generateSignal({
    kind: "activity_spike",
    severity: "high",
    title: `Activity spike — ${delta} new high-severity findings`,
    description: `${curr.entity.label} now surfaces ${currHigh} high/critical findings (was ${prevHigh}). Investigate the source of the spike.`,
    direction: "deteriorating",
    magnitude: Math.min(100, delta * 30),
    entity: { ...curr.entity },
    previous: snapRef(prev),
    current: snapRef(curr),
  });
}

// ---------- top-level ----------

/**
 * Run every detector and return the merged signal list sorted by
 * magnitude (largest first) so consumers can render or alert on the
 * most material changes without re-sorting.
 */
export function detectChanges(
  prev: MemoryEntry,
  curr: MemoryEntry,
): Signal[] {
  const signals: Signal[] = [];

  const score = detectScoreChange(prev, curr);
  if (score) signals.push(score);

  const verdict = detectVerdictShift(prev, curr);
  if (verdict) signals.push(verdict);

  signals.push(...detectNewFindings(prev, curr));
  signals.push(...detectResolvedFindings(prev, curr));
  signals.push(...detectSeverityEscalations(prev, curr));

  const confidence = detectConfidenceMovement(prev, curr);
  if (confidence) signals.push(confidence);

  const spike = detectActivitySpike(prev, curr);
  if (spike) signals.push(spike);

  return signals.sort((a, b) => b.magnitude - a.magnitude);
}
