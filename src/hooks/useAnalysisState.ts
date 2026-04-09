/**
 * Oracle Sentinel — React binding for the analysis state engine.
 *
 * Subscribes to the default analysis state controller and returns
 * the current snapshot. UI components call this hook to render
 * real-time progress feedback without knowing anything about the
 * underlying state machine.
 *
 *     const { state, progress, stepLabel } = useAnalysisState();
 *
 * The hook accepts an optional controller argument so tests (or
 * pages that run their own isolated analysis pipeline) can bind to
 * a non-singleton controller.
 *
 * This file is a HOOK, not a component. It does not touch the UI
 * layout or render any DOM — it simply plugs the observable
 * controller into React's useSyncExternalStore-style pattern.
 */

import { useSyncExternalStore } from "react";
import {
  analysisStateController,
  AnalysisStateController,
} from "@/lib/analysis-state/controller";
import type { AnalysisSnapshot } from "@/lib/analysis-state/types";

export type UseAnalysisStateResult = AnalysisSnapshot;

export function useAnalysisState(
  controller: AnalysisStateController = analysisStateController,
): UseAnalysisStateResult {
  return useSyncExternalStore(
    (listener) => {
      // subscribe: the controller calls the listener once
      // immediately with the current snapshot; we wrap it to a
      // no-argument listener for useSyncExternalStore's contract.
      return controller.subscribe(() => listener());
    },
    () => controller.getSnapshot(),
    () => controller.getSnapshot(),
  );
}
