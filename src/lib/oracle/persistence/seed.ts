import { defaultCommandBrain } from "../engine/command-brain";
import type { Investigation } from "../engine/types";
import { investigationToSnapshot } from "./recorder";
import type { InvestigationSnapshot, SnapshotStore } from "./types";

/**
 * Demo seeding.
 *
 * Generates a deterministic history of snapshots for the same set of
 * entities the rest of the engine knows about, so the History page
 * shows real drift the moment a user opens it.
 *
 * The synthetic history is anchored to the *current* engine reading and
 * walks backward through 6 weekly snapshots, applying small bounded
 * perturbations to simulate score evolution. We never invent data — the
 * latest point always matches what the engine produces today.
 */

const SEEDED_ENTITIES = [
  "Whale 042",
  "Fresh Wallet 01",
  "SALPHA",
  "MoonPaw Inu",
  "Luminar Genesis",
  "Night Circuit Club",
] as const;

interface PerturbationSpec {
  /** Drift applied per week, walking backward in time. */
  weeklyDrift: number;
  /** Confidence drift per week. */
  confidenceDrift: number;
}

const PROFILES: Record<string, PerturbationSpec> = {
  "Whale 042": { weeklyDrift: 0.5, confidenceDrift: -0.5 },
  "Fresh Wallet 01": { weeklyDrift: -8, confidenceDrift: -2 },
  SALPHA: { weeklyDrift: 0.3, confidenceDrift: -0.4 },
  "MoonPaw Inu": { weeklyDrift: -6, confidenceDrift: -3 },
  "Luminar Genesis": { weeklyDrift: 0.8, confidenceDrift: -0.6 },
  "Night Circuit Club": { weeklyDrift: -5, confidenceDrift: -2 },
};

const WEEKS = 6;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function backfill(inv: Investigation): InvestigationSnapshot[] {
  const profile = PROFILES[inv.entity.label] ?? {
    weeklyDrift: 0,
    confidenceDrift: 0,
  };
  const out: InvestigationSnapshot[] = [];
  const nowMs = new Date(inv.completedAt).getTime();
  // Walk weeks back from "now". Index 0 = oldest snapshot.
  for (let i = WEEKS; i >= 0; i--) {
    const t = new Date(nowMs - i * MS_PER_WEEK).toISOString();
    // The current reading is the anchor. Past weeks deviate by
    // i * weeklyDrift in the OPPOSITE direction (a negative weeklyDrift
    // means the score has been climbing, so older weeks were lower).
    const score = clamp(
      Math.round(inv.overallRiskScore - i * profile.weeklyDrift),
      0,
      100,
    );
    const confidence = clamp(
      Math.round(inv.overallConfidence.value - i * profile.confidenceDrift),
      0,
      100,
    );
    out.push({
      ...investigationToSnapshot(inv, t),
      takenAt: t,
      riskScore: score,
      confidence,
    });
  }
  return out;
}

/**
 * Idempotent seeder. Inspects the store; if any of the seeded entities
 * is already present, the seed does nothing. Otherwise it generates the
 * full backfill in one transaction.
 */
export async function seedIfEmpty(store: SnapshotStore): Promise<{
  seeded: boolean;
  count: number;
}> {
  const existing = await store.listAll();
  const haveAny = existing.some((s) =>
    (SEEDED_ENTITIES as readonly string[]).includes(s.entityLabel),
  );
  if (haveAny) return { seeded: false, count: existing.length };

  let count = 0;
  for (const label of SEEDED_ENTITIES) {
    const inv = defaultCommandBrain.investigate({ identifier: label });
    const snaps = backfill(inv);
    for (const s of snaps) {
      await store.record(s);
      count += 1;
    }
  }
  return { seeded: true, count };
}
