/**
 * Phase catalog and transition rules.
 *
 * Each phase has a fixed progress percentage and a decision-grade
 * step label. The transition rules enforce a directed graph: callers
 * cannot jump backwards (except via explicit reset to `idle`) and
 * cannot skip phases when driving the machine manually.
 *
 * `completed` and `error` are terminal — to start a new run the
 * caller must reset to `idle` first.
 */

import type { AnalysisPhase, PhaseInfo } from "./types";

export const PHASE_CATALOG: Record<AnalysisPhase, PhaseInfo> = {
  idle: {
    phase: "idle",
    progress: 0,
    stepLabel: "Idle",
    description: "No analysis in progress.",
  },
  scanning: {
    phase: "scanning",
    progress: 15,
    stepLabel: "Scanning entity",
    description: "Resolving target and pulling on-chain snapshot.",
  },
  agent_processing: {
    phase: "agent_processing",
    progress: 45,
    stepLabel: "Running specialized agents",
    description:
      "Specialized agents are inspecting the entity in parallel.",
  },
  cross_checking: {
    phase: "cross_checking",
    progress: 65,
    stepLabel: "Cross-checking signals",
    description:
      "Agent outputs are being cross-referenced and conflicts resolved.",
  },
  resolving: {
    phase: "resolving",
    progress: 80,
    stepLabel: "Aggregating score",
    description:
      "Weighted scoring and confidence aggregation in progress.",
  },
  generating_verdict: {
    phase: "generating_verdict",
    progress: 92,
    stepLabel: "Generating verdict",
    description:
      "Synthesis and decision-grade verdict composition in progress.",
  },
  completed: {
    phase: "completed",
    progress: 100,
    stepLabel: "Analysis complete",
    description: "The analysis finished and a verdict is available.",
  },
  error: {
    phase: "error",
    progress: 0,
    stepLabel: "Analysis failed",
    description: "The analysis failed before a verdict could be produced.",
  },
};

/**
 * The canonical forward ordering of phases. Used by the controller
 * to reject illegal backwards transitions.
 */
export const PHASE_ORDER: AnalysisPhase[] = [
  "idle",
  "scanning",
  "agent_processing",
  "cross_checking",
  "resolving",
  "generating_verdict",
  "completed",
];

export function phaseRank(phase: AnalysisPhase): number {
  const idx = PHASE_ORDER.indexOf(phase);
  return idx === -1 ? -1 : idx;
}

/**
 * Returns true if `to` is a legal next phase from `from`. Rules:
 *   - Any non-idle phase can jump to `error` or back to `idle` (reset).
 *   - Idle can only go to scanning (the canonical start).
 *   - Forward transitions must follow PHASE_ORDER (no skipping).
 *   - Terminal phases (completed, error) can only transition to idle.
 */
export function canTransition(
  from: AnalysisPhase,
  to: AnalysisPhase,
): boolean {
  if (from === to) return true; // no-op transitions are tolerated
  if (to === "idle") return true; // reset is always allowed

  // Terminal states can only go back to idle. Checked BEFORE the
  // `to === "error"` rule so a completed run cannot be re-failed.
  if (from === "completed" || from === "error") return false;

  if (to === "error") return from !== "idle"; // only active runs can error

  const fromRank = phaseRank(from);
  const toRank = phaseRank(to);
  if (fromRank === -1 || toRank === -1) return false;
  return toRank === fromRank + 1;
}
