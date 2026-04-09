/**
 * Analysis state controller.
 *
 * A small observable that owns the current AnalysisSnapshot and
 * emits updates to subscribed listeners. Listeners receive the full
 * snapshot on every transition, including the initial state when
 * they subscribe (so they never miss the first paint).
 *
 * The controller is pure TypeScript — no React, no UI coupling.
 * React consumers bind it via `useAnalysisState` in the hooks layer.
 */

import { canTransition, PHASE_CATALOG } from "./machine";
import type {
  AnalysisPhase,
  AnalysisSnapshot,
  AnalysisStateListener,
} from "./types";

export class AnalysisStateController {
  private _snapshot: AnalysisSnapshot;
  private listeners = new Set<AnalysisStateListener>();

  constructor(initial: AnalysisPhase = "idle") {
    this._snapshot = this.buildSnapshot(initial);
  }

  private buildSnapshot(
    phase: AnalysisPhase,
    previous?: AnalysisSnapshot,
    error?: string,
  ): AnalysisSnapshot {
    const info = PHASE_CATALOG[phase];
    const now = new Date().toISOString();
    const startedAt =
      phase === "idle"
        ? undefined
        : phase === "scanning"
          ? now
          : previous?.startedAt;
    return {
      state: phase,
      progress: info.progress,
      stepLabel: info.stepLabel,
      description: info.description,
      startedAt,
      updatedAt: now,
      error,
    };
  }

  /** Current snapshot — synchronous accessor for hooks and tests. */
  getSnapshot(): AnalysisSnapshot {
    return this._snapshot;
  }

  /**
   * Transition to a new phase. Illegal transitions are silently
   * ignored so callers do not need try/catch around the machine.
   * Returns true if the transition was applied.
   */
  transition(phase: AnalysisPhase, error?: string): boolean {
    if (!canTransition(this._snapshot.state, phase)) return false;
    if (phase === this._snapshot.state && !error) return false;
    this._snapshot = this.buildSnapshot(phase, this._snapshot, error);
    this.emit();
    return true;
  }

  /** Reset to idle. Always allowed. */
  reset(): void {
    this._snapshot = this.buildSnapshot("idle");
    this.emit();
  }

  /** Mark the current run as failed. */
  fail(errorMessage: string): void {
    if (this._snapshot.state === "idle") return;
    this._snapshot = this.buildSnapshot("error", this._snapshot, errorMessage);
    this.emit();
  }

  /**
   * Subscribe to snapshot updates. The listener is invoked once
   * immediately with the current snapshot, then on every transition.
   * Returns an unsubscribe function.
   */
  subscribe(listener: AnalysisStateListener): () => void {
    this.listeners.add(listener);
    listener(this._snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this._snapshot);
  }
}

/**
 * Default singleton used by the `useAnalysisState` React hook and
 * the `runTrackedAnalysis` helper. Tests should construct their own
 * controller to avoid cross-test pollution.
 */
export const analysisStateController = new AnalysisStateController();
