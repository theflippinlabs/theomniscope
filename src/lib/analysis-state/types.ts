/**
 * Oracle Sentinel — analysis state engine types.
 *
 * A small, explicit state machine for the lifecycle of an analysis
 * run. The engine itself is synchronous; the state machine is a
 * separate observable surface the UI layer can subscribe to in order
 * to render real-time feedback without reaching into the engine.
 */

export type AnalysisPhase =
  | "idle"
  | "scanning"
  | "agent_processing"
  | "cross_checking"
  | "resolving"
  | "generating_verdict"
  | "completed"
  | "error";

export interface PhaseInfo {
  phase: AnalysisPhase;
  progress: number; // 0..100
  stepLabel: string;
  description: string;
}

/**
 * The current state of the analysis engine, as seen by a subscriber
 * (typically a React hook or a logging worker).
 */
export interface AnalysisSnapshot {
  state: AnalysisPhase;
  progress: number;
  stepLabel: string;
  description: string;
  /** When the current run began (the last time it transitioned out of idle). */
  startedAt?: string;
  /** When this snapshot was emitted. */
  updatedAt: string;
  /** Optional error captured when the machine lands in "error". */
  error?: string;
}

export type AnalysisStateListener = (snapshot: AnalysisSnapshot) => void;
