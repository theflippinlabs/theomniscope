/**
 * Tracked runner — wraps a unit of work so the controller
 * transitions through every phase as the work executes.
 *
 * Usage:
 *
 *     const report = await runTrackedAnalysis(() =>
 *       defaultCommandBrain.investigate({ identifier }),
 *     );
 *
 * The work function can be sync or async. A microtask yield between
 * each phase lets subscribed React components re-render so the UI
 * sees a quick, clean progression rather than a single jump from
 * idle to completed.
 */

import { analysisStateController, AnalysisStateController } from "./controller";

async function yieldToMicrotask(): Promise<void> {
  await Promise.resolve();
}

export async function runTrackedAnalysis<T>(
  work: () => T | Promise<T>,
  controller: AnalysisStateController = analysisStateController,
): Promise<T> {
  controller.reset();
  try {
    controller.transition("scanning");
    await yieldToMicrotask();

    controller.transition("agent_processing");
    await yieldToMicrotask();
    const raw = await work();

    controller.transition("cross_checking");
    await yieldToMicrotask();

    controller.transition("resolving");
    await yieldToMicrotask();

    controller.transition("generating_verdict");
    await yieldToMicrotask();

    controller.transition("completed");
    return raw;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    controller.fail(message);
    throw err;
  }
}
