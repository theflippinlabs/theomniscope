/**
 * Oracle Sentinel — analysis state engine public surface.
 */

export type {
  AnalysisPhase,
  AnalysisSnapshot,
  PhaseInfo,
  AnalysisStateListener,
} from "./types";

export {
  PHASE_CATALOG,
  PHASE_ORDER,
  canTransition,
  phaseRank,
} from "./machine";

export {
  AnalysisStateController,
  analysisStateController,
} from "./controller";

export { runTrackedAnalysis } from "./tracked";
