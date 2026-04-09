import { describe, expect, it, vi } from "vitest";
import {
  AnalysisStateController,
  analysisStateController,
  canTransition,
  PHASE_CATALOG,
  PHASE_ORDER,
  phaseRank,
  runTrackedAnalysis,
  type AnalysisSnapshot,
} from "@/lib/analysis-state";

// ---------- phase catalog ----------

describe("analysis-state — phase catalog", () => {
  it("has a deterministic progress ramp from 0 → 100", () => {
    expect(PHASE_CATALOG.idle.progress).toBe(0);
    expect(PHASE_CATALOG.scanning.progress).toBeGreaterThan(0);
    expect(PHASE_CATALOG.agent_processing.progress).toBeGreaterThan(
      PHASE_CATALOG.scanning.progress,
    );
    expect(PHASE_CATALOG.cross_checking.progress).toBeGreaterThan(
      PHASE_CATALOG.agent_processing.progress,
    );
    expect(PHASE_CATALOG.resolving.progress).toBeGreaterThan(
      PHASE_CATALOG.cross_checking.progress,
    );
    expect(PHASE_CATALOG.generating_verdict.progress).toBeGreaterThan(
      PHASE_CATALOG.resolving.progress,
    );
    expect(PHASE_CATALOG.completed.progress).toBe(100);
  });

  it("every phase carries a non-empty label", () => {
    for (const info of Object.values(PHASE_CATALOG)) {
      expect(info.stepLabel).toBeTruthy();
      expect(info.description).toBeTruthy();
    }
  });

  it("phaseRank returns the expected order", () => {
    expect(phaseRank("idle")).toBe(0);
    expect(phaseRank("completed")).toBe(PHASE_ORDER.length - 1);
    expect(phaseRank("error")).toBe(-1);
  });
});

// ---------- transition rules ----------

describe("analysis-state — canTransition", () => {
  it("allows forward progression through the canonical order", () => {
    expect(canTransition("idle", "scanning")).toBe(true);
    expect(canTransition("scanning", "agent_processing")).toBe(true);
    expect(canTransition("agent_processing", "cross_checking")).toBe(true);
    expect(canTransition("cross_checking", "resolving")).toBe(true);
    expect(canTransition("resolving", "generating_verdict")).toBe(true);
    expect(canTransition("generating_verdict", "completed")).toBe(true);
  });

  it("rejects skipping phases", () => {
    expect(canTransition("idle", "agent_processing")).toBe(false);
    expect(canTransition("scanning", "resolving")).toBe(false);
    expect(canTransition("agent_processing", "completed")).toBe(false);
  });

  it("rejects backwards transitions", () => {
    expect(canTransition("agent_processing", "scanning")).toBe(false);
    expect(canTransition("completed", "resolving")).toBe(false);
  });

  it("always allows reset to idle", () => {
    expect(canTransition("scanning", "idle")).toBe(true);
    expect(canTransition("completed", "idle")).toBe(true);
    expect(canTransition("error", "idle")).toBe(true);
  });

  it("allows error from any active phase but not from idle", () => {
    expect(canTransition("scanning", "error")).toBe(true);
    expect(canTransition("agent_processing", "error")).toBe(true);
    expect(canTransition("idle", "error")).toBe(false);
  });

  it("does not allow exits from terminal states except via idle", () => {
    expect(canTransition("completed", "scanning")).toBe(false);
    expect(canTransition("completed", "error")).toBe(false);
    expect(canTransition("error", "scanning")).toBe(false);
  });
});

// ---------- controller ----------

describe("analysis-state — AnalysisStateController", () => {
  it("starts in idle with progress 0", () => {
    const c = new AnalysisStateController();
    const snap = c.getSnapshot();
    expect(snap.state).toBe("idle");
    expect(snap.progress).toBe(0);
  });

  it("emits to subscribers on every transition", () => {
    const c = new AnalysisStateController();
    const events: AnalysisSnapshot[] = [];
    const unsubscribe = c.subscribe((s) => events.push(s));

    // subscribe fires an initial event with the current state
    expect(events.length).toBe(1);
    expect(events[0].state).toBe("idle");

    c.transition("scanning");
    expect(events.length).toBe(2);
    expect(events[1].state).toBe("scanning");

    c.transition("agent_processing");
    expect(events.length).toBe(3);
    expect(events[2].state).toBe("agent_processing");

    unsubscribe();
    c.transition("cross_checking");
    expect(events.length).toBe(3); // no more events after unsubscribe
  });

  it("ignores illegal transitions silently", () => {
    const c = new AnalysisStateController();
    const applied = c.transition("completed"); // illegal from idle
    expect(applied).toBe(false);
    expect(c.getSnapshot().state).toBe("idle");
  });

  it("sets startedAt on the first scanning transition", () => {
    const c = new AnalysisStateController();
    expect(c.getSnapshot().startedAt).toBeUndefined();
    c.transition("scanning");
    const started = c.getSnapshot().startedAt;
    expect(started).toBeTruthy();
    c.transition("agent_processing");
    // startedAt persists across subsequent forward transitions
    expect(c.getSnapshot().startedAt).toBe(started);
  });

  it("reset drops back to idle and clears startedAt", () => {
    const c = new AnalysisStateController();
    c.transition("scanning");
    c.transition("agent_processing");
    c.reset();
    const snap = c.getSnapshot();
    expect(snap.state).toBe("idle");
    expect(snap.startedAt).toBeUndefined();
  });

  it("fail transitions to error and keeps the error message", () => {
    const c = new AnalysisStateController();
    c.transition("scanning");
    c.fail("provider timeout");
    const snap = c.getSnapshot();
    expect(snap.state).toBe("error");
    expect(snap.error).toBe("provider timeout");
  });

  it("fail from idle is a no-op", () => {
    const c = new AnalysisStateController();
    c.fail("nothing to fail");
    expect(c.getSnapshot().state).toBe("idle");
  });
});

// ---------- runTrackedAnalysis ----------

describe("analysis-state — runTrackedAnalysis", () => {
  it("drives the controller through every phase and returns the work result", async () => {
    const c = new AnalysisStateController();
    const seen: string[] = [];
    c.subscribe((s) => seen.push(s.state));
    const work = vi.fn(() => "report-value");
    const result = await runTrackedAnalysis(work, c);
    expect(result).toBe("report-value");
    expect(work).toHaveBeenCalledOnce();
    // seen should include idle → scanning → agent_processing → …
    expect(seen).toContain("scanning");
    expect(seen).toContain("agent_processing");
    expect(seen).toContain("cross_checking");
    expect(seen).toContain("resolving");
    expect(seen).toContain("generating_verdict");
    expect(seen).toContain("completed");
    expect(c.getSnapshot().state).toBe("completed");
    expect(c.getSnapshot().progress).toBe(100);
  });

  it("fails the controller when the work throws", async () => {
    const c = new AnalysisStateController();
    await expect(
      runTrackedAnalysis(() => {
        throw new Error("boom");
      }, c),
    ).rejects.toThrow("boom");
    expect(c.getSnapshot().state).toBe("error");
    expect(c.getSnapshot().error).toBe("boom");
  });

  it("supports async work functions", async () => {
    const c = new AnalysisStateController();
    const result = await runTrackedAnalysis(async () => {
      await Promise.resolve();
      return 42;
    }, c);
    expect(result).toBe(42);
    expect(c.getSnapshot().state).toBe("completed");
  });
});

// ---------- default singleton ----------

describe("analysis-state — default singleton", () => {
  it("exports a usable default controller", () => {
    analysisStateController.reset();
    expect(analysisStateController.getSnapshot().state).toBe("idle");
    analysisStateController.transition("scanning");
    expect(analysisStateController.getSnapshot().state).toBe("scanning");
    analysisStateController.reset();
  });
});
