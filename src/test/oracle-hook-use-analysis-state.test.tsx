import { describe, expect, it, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAnalysisState } from "@/hooks/useAnalysisState";
import { AnalysisStateController } from "@/lib/analysis-state";

afterEach(() => cleanup());

describe("hooks — useAnalysisState", () => {
  it("returns the initial idle snapshot from a fresh controller", () => {
    const controller = new AnalysisStateController();
    const { result } = renderHook(() => useAnalysisState(controller));
    expect(result.current.state).toBe("idle");
    expect(result.current.progress).toBe(0);
    expect(result.current.stepLabel).toBe("Idle");
  });

  it("re-renders when the controller transitions", () => {
    const controller = new AnalysisStateController();
    const { result } = renderHook(() => useAnalysisState(controller));

    act(() => {
      controller.transition("scanning");
    });
    expect(result.current.state).toBe("scanning");
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.stepLabel).toBe("Scanning entity");

    act(() => {
      controller.transition("agent_processing");
    });
    expect(result.current.state).toBe("agent_processing");
  });

  it("reflects completion", () => {
    const controller = new AnalysisStateController();
    const { result } = renderHook(() => useAnalysisState(controller));
    act(() => {
      controller.transition("scanning");
      controller.transition("agent_processing");
      controller.transition("cross_checking");
      controller.transition("resolving");
      controller.transition("generating_verdict");
      controller.transition("completed");
    });
    expect(result.current.state).toBe("completed");
    expect(result.current.progress).toBe(100);
  });

  it("reflects reset", () => {
    const controller = new AnalysisStateController();
    const { result } = renderHook(() => useAnalysisState(controller));
    act(() => {
      controller.transition("scanning");
    });
    expect(result.current.state).toBe("scanning");
    act(() => {
      controller.reset();
    });
    expect(result.current.state).toBe("idle");
    expect(result.current.startedAt).toBeUndefined();
  });
});
