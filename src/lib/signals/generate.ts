/**
 * Signal generation helpers.
 *
 * `generateSignal` is the canonical factory for building a `Signal`
 * from a spec object. Detectors use it internally; external callers
 * can also use it to emit synthetic signals (e.g. a backend worker
 * injecting a "manual review requested" signal into the stream).
 *
 * `generateChangeSummary` composes a natural-language summary of a
 * comparison between two MemoryEntries + the signals that surfaced.
 */

import type { MemoryEntry } from "../memory/types";
import type {
  ChangeSummary,
  Signal,
  SignalDirection,
  SignalSpec,
} from "./types";

let counter = 0;
function nextId(kind: string): string {
  counter += 1;
  return `sig_${Date.now()}_${counter.toString(36)}_${kind}`;
}

/**
 * Build a fully-formed Signal from a spec. The factory attaches an
 * id and a detectedAt timestamp — everything else comes from the
 * caller. This is the single place where Signal objects are minted.
 */
export function generateSignal(spec: SignalSpec): Signal {
  return {
    id: nextId(spec.kind),
    detectedAt: new Date().toISOString(),
    ...spec,
  };
}

// ---------- narrative summary ----------

function buildNarrative(
  prev: MemoryEntry,
  curr: MemoryEntry,
  signals: Signal[],
  direction: SignalDirection,
): string {
  if (signals.length === 0) {
    return `No material change on ${curr.entity.label}. Verdict remains ${curr.verdict}.`;
  }

  const headline = signals[0];
  const remaining = signals.length - 1;
  const tail =
    remaining > 0
      ? ` Plus ${remaining} other signal${remaining === 1 ? "" : "s"}.`
      : "";

  const verdictFragment =
    prev.verdict === curr.verdict
      ? `Verdict holds at ${curr.verdict}.`
      : `Verdict: ${prev.verdict} → ${curr.verdict}.`;

  const directionWord =
    direction === "deteriorating"
      ? "Deteriorating"
      : direction === "improving"
        ? "Improving"
        : "Stable";

  return `${curr.entity.label}: ${headline.title}.${tail} ${directionWord} trajectory. ${verdictFragment}`;
}

/**
 * Compose a natural-language ChangeSummary from a prev/curr pair and
 * a pre-computed signal list. Returns a summary even when no signals
 * surfaced (with an explicit "no change" narrative), and handles the
 * first-observation case when `prev` is null.
 */
export function generateChangeSummary(
  prev: MemoryEntry | null,
  curr: MemoryEntry,
  signals: Signal[],
): ChangeSummary {
  if (!prev) {
    return {
      entity: curr.entity,
      signals,
      overallDirection: "stable",
      significantChange: false,
      narrative: `First analysis recorded for ${curr.entity.label}. Verdict: ${curr.verdict}.`,
      previousVerdict: undefined,
      currentVerdict: curr.verdict,
    };
  }

  const deteriorating = signals.filter(
    (s) => s.direction === "deteriorating",
  ).length;
  const improving = signals.filter((s) => s.direction === "improving").length;

  const overallDirection: SignalDirection =
    deteriorating > improving
      ? "deteriorating"
      : improving > deteriorating
        ? "improving"
        : "stable";

  const significantChange = signals.some(
    (s) => s.severity === "critical" || s.severity === "high",
  );

  return {
    entity: curr.entity,
    signals,
    overallDirection,
    significantChange,
    narrative: buildNarrative(prev, curr, signals, overallDirection),
    previousVerdict: prev.verdict,
    currentVerdict: curr.verdict,
  };
}
