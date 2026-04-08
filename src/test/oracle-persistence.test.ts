import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  InMemorySnapshotStore,
  computeAllDrifts,
  computeDrift,
  investigationToSnapshot,
  seedIfEmpty,
  type InvestigationSnapshot,
} from "@/lib/oracle/persistence";
import { defaultCommandBrain } from "@/lib/oracle/engine/command-brain";

function snap(
  partial: Partial<InvestigationSnapshot>,
): InvestigationSnapshot {
  return {
    id: "id",
    entityIdentifier: "0xabc",
    entityLabel: "Whale 042",
    entityType: "wallet",
    takenAt: new Date().toISOString(),
    riskScore: 50,
    confidence: 70,
    riskLabel: "Neutral",
    trendDirection: "stable",
    topFindingsCount: 0,
    highSeverityCount: 0,
    summary: "demo",
    ...partial,
  };
}

describe("Oracle persistence — InMemorySnapshotStore", () => {
  let store: InMemorySnapshotStore;
  beforeEach(() => {
    store = new InMemorySnapshotStore();
  });

  it("records and lists snapshots in chronological order", async () => {
    await store.record(snap({ id: "a", takenAt: "2026-04-01T00:00:00Z", riskScore: 10 }));
    await store.record(snap({ id: "b", takenAt: "2026-04-02T00:00:00Z", riskScore: 30 }));
    await store.record(snap({ id: "c", takenAt: "2026-04-03T00:00:00Z", riskScore: 50 }));
    const list = await store.list("0xabc");
    expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("listLatestPerEntity returns the most recent snapshot per entity", async () => {
    await store.record(
      snap({ entityIdentifier: "0xabc", takenAt: "2026-04-01T00:00:00Z", riskScore: 10 }),
    );
    await store.record(
      snap({ entityIdentifier: "0xabc", takenAt: "2026-04-02T00:00:00Z", riskScore: 30 }),
    );
    await store.record(
      snap({ entityIdentifier: "0xdef", entityLabel: "Other", takenAt: "2026-04-02T00:00:00Z", riskScore: 80 }),
    );
    const latest = await store.listLatestPerEntity();
    expect(latest.length).toBe(2);
    expect(latest.find((s) => s.entityIdentifier === "0xabc")?.riskScore).toBe(30);
    expect(latest.find((s) => s.entityIdentifier === "0xdef")?.riskScore).toBe(80);
  });

  it("removes by entity identifier", async () => {
    await store.record(snap({ entityIdentifier: "0xabc" }));
    await store.record(snap({ entityIdentifier: "0xdef", entityLabel: "Other" }));
    await store.remove("0xabc");
    const all = await store.listAll();
    expect(all.length).toBe(1);
    expect(all[0].entityIdentifier).toBe("0xdef");
  });

  it("clear empties the store", async () => {
    await store.record(snap());
    await store.clear();
    const all = await store.listAll();
    expect(all.length).toBe(0);
  });
});

describe("Oracle persistence — drift computation", () => {
  it("computeDrift returns null for an empty list", () => {
    expect(computeDrift([])).toBeNull();
  });

  it("computes a deteriorating drift when score climbs", () => {
    const points = [
      snap({ takenAt: "2026-04-01T00:00:00Z", riskScore: 20, confidence: 70 }),
      snap({ takenAt: "2026-04-02T00:00:00Z", riskScore: 40, confidence: 65 }),
      snap({ takenAt: "2026-04-03T00:00:00Z", riskScore: 60, confidence: 60 }),
    ];
    const d = computeDrift(points)!;
    expect(d.scoreNow).toBe(60);
    expect(d.scoreThen).toBe(20);
    expect(d.scoreDelta).toBe(40);
    expect(d.confidenceDelta).toBe(-10);
    expect(d.scoreVolatility).toBe(40);
    expect(d.direction).toBe("deteriorating");
    expect(d.points.length).toBe(3);
  });

  it("computes an improving drift when score falls", () => {
    const points = [
      snap({ takenAt: "2026-04-01T00:00:00Z", riskScore: 80 }),
      snap({ takenAt: "2026-04-02T00:00:00Z", riskScore: 70 }),
      snap({ takenAt: "2026-04-03T00:00:00Z", riskScore: 60 }),
    ];
    const d = computeDrift(points)!;
    expect(d.direction).toBe("improving");
    expect(d.scoreDelta).toBe(-20);
  });

  it("computes a stable drift when score holds", () => {
    const points = [
      snap({ takenAt: "2026-04-01T00:00:00Z", riskScore: 40 }),
      snap({ takenAt: "2026-04-02T00:00:00Z", riskScore: 41 }),
      snap({ takenAt: "2026-04-03T00:00:00Z", riskScore: 42 }),
    ];
    const d = computeDrift(points)!;
    expect(d.direction).toBe("stable");
  });

  it("computeAllDrifts groups by entity and sorts most-volatile first", () => {
    const all = [
      snap({ entityIdentifier: "a", entityLabel: "Calm", takenAt: "2026-04-01T00:00:00Z", riskScore: 30 }),
      snap({ entityIdentifier: "a", entityLabel: "Calm", takenAt: "2026-04-02T00:00:00Z", riskScore: 31 }),
      snap({ entityIdentifier: "b", entityLabel: "Wild", takenAt: "2026-04-01T00:00:00Z", riskScore: 20 }),
      snap({ entityIdentifier: "b", entityLabel: "Wild", takenAt: "2026-04-02T00:00:00Z", riskScore: 80 }),
    ];
    const drifts = computeAllDrifts(all);
    expect(drifts.length).toBe(2);
    expect(drifts[0].entityLabel).toBe("Wild");
    expect(drifts[1].entityLabel).toBe("Calm");
  });
});

describe("Oracle persistence — recorder + seeder", () => {
  it("investigationToSnapshot projects the engine investigation correctly", () => {
    const inv = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    const s = investigationToSnapshot(inv);
    expect(s.entityIdentifier).toBe(inv.entity.identifier);
    expect(s.entityType).toBe("token");
    expect(s.riskScore).toBe(inv.overallRiskScore);
    expect(s.confidence).toBe(inv.overallConfidence.value);
    expect(s.riskLabel).toBe(inv.riskLabel);
    expect(s.summary).toBe(inv.executiveSummary);
    expect(s.highSeverityCount).toBeGreaterThan(0);
  });

  it("seedIfEmpty seeds the store when empty and is idempotent on re-run", async () => {
    const store = new InMemorySnapshotStore();
    const a = await seedIfEmpty(store);
    expect(a.seeded).toBe(true);
    expect(a.count).toBeGreaterThan(0);
    const all = await store.listAll();
    expect(all.length).toBeGreaterThanOrEqual(7); // 6 entities × ≥1 weeks

    const b = await seedIfEmpty(store);
    expect(b.seeded).toBe(false);
    const allAgain = await store.listAll();
    expect(allAgain.length).toBe(all.length);
  });

  it("seeded snapshots cover every demo entity", async () => {
    const store = new InMemorySnapshotStore();
    await seedIfEmpty(store);
    const latest = await store.listLatestPerEntity();
    const labels = latest.map((s) => s.entityLabel);
    for (const expected of [
      "Whale 042",
      "Fresh Wallet 01",
      "SALPHA",
      "MoonPaw Inu",
      "Luminar Genesis",
      "Night Circuit Club",
    ]) {
      expect(labels.some((l) => l.includes(expected))).toBe(true);
    }
  });

  it("seeded latest snapshot for an entity matches the current engine reading", async () => {
    const store = new InMemorySnapshotStore();
    await seedIfEmpty(store);
    const latest = await store.listLatestPerEntity();
    const moon = latest.find((s) => s.entityLabel.includes("MoonPaw"));
    expect(moon).toBeTruthy();
    const fresh = defaultCommandBrain.investigate({ identifier: "MoonPaw Inu" });
    expect(moon!.riskScore).toBe(fresh.overallRiskScore);
    expect(moon!.confidence).toBe(fresh.overallConfidence.value);
  });
});
