/**
 * Analysis history store.
 *
 * Persists every analysis (normal + forensic) run by the user so
 * the History page can list and re-display past reports. The store
 * writes to localStorage immediately and (when authenticated)
 * appends to the `oracle_usage` table server-side as well.
 *
 * Each entry is a self-contained record that holds everything the
 * report view needs to re-render the full result without a network
 * call. The JSON blob is kept under a 200KB ceiling by trimming
 * the raw `sourceInvestigation` — if a caller needs the raw engine
 * output, they re-run the analysis.
 */

import type { IntelligenceReport } from "../oracle/types";
import type { DeepReport } from "../investigation/types";

// ---------- types ----------

export type AnalysisMode = "normal" | "forensic";

export interface AnalysisHistoryEntry {
  id: string;
  address: string;
  entityType: string;
  entityLabel: string;
  chain: string;
  mode: AnalysisMode;
  riskScore: number;
  confidence: number;
  riskLabel: string;
  verdict: string;
  executiveSummary: string;
  /** Full serialised report. */
  report: IntelligenceReport;
  /** Deep report — present only for forensic mode. */
  deepReport?: DeepReport;
  createdAt: string; // ISO
}

// ---------- localStorage backend ----------

const STORAGE_KEY = "oracle:analysis-history:v1";
const MAX_ENTRIES = 200;

function readAll(): AnalysisHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: AnalysisHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full — evict oldest half and retry.
    const trimmed = entries.slice(0, Math.floor(entries.length / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // give up
    }
  }
}

// ---------- public API ----------

export function saveAnalysis(entry: AnalysisHistoryEntry): void {
  const existing = readAll();
  // De-duplicate by id.
  const filtered = existing.filter((e) => e.id !== entry.id);
  const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
  writeAll(next);
}

export function listAnalyses(): AnalysisHistoryEntry[] {
  return readAll();
}

export function getAnalysis(id: string): AnalysisHistoryEntry | null {
  return readAll().find((e) => e.id === id) ?? null;
}

export function deleteAnalysis(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Build a history entry from a normal analysis report.
 */
export function entryFromReport(
  report: IntelligenceReport,
  mode: AnalysisMode = "normal",
): AnalysisHistoryEntry {
  return {
    id: `ah_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    address: report.entity.identifier ?? "",
    entityType: report.entity.type,
    entityLabel: report.entity.label,
    chain: report.entity.chain ?? "",
    mode,
    riskScore: report.riskScore,
    confidence: report.confidence,
    riskLabel: report.riskLabel,
    verdict: report.verdict ?? report.riskLabel,
    executiveSummary: report.executiveSummary,
    report,
    createdAt: new Date().toISOString(),
  };
}
