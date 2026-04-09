import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DecisionTier } from "../engine/normalize";
import type { EntityType, RiskLabel, TrendDirection } from "../engine/types";
import type {
  InvestigationSnapshot,
  KeyFindingSnapshot,
  SnapshotStore,
} from "./types";

/**
 * Supabase-backed snapshot store.
 *
 * Schema (see supabase/migrations/*_oracle_snapshots.sql):
 *
 *   oracle_snapshots
 *     id                 uuid primary key
 *     entity_identifier  text not null
 *     entity_label       text not null
 *     entity_type        text not null
 *     taken_at           timestamptz not null default now()
 *     risk_score         int  not null
 *     confidence         int  not null
 *     risk_label         text not null
 *     trend_direction    text not null
 *     top_findings_count int  not null default 0
 *     high_severity_count int not null default 0
 *     summary            text not null
 *
 * The store creates its own Supabase client lazily so importing the
 * persistence layer never crashes in environments without env vars
 * (tests, the public landing page in dev, etc.). The factory in
 * `persistence/index.ts` only constructs this class when the URL and
 * key are present.
 */
const TABLE = "oracle_snapshots";

interface Row {
  id: string;
  entity_identifier: string;
  entity_label: string;
  entity_type: string;
  taken_at: string;
  risk_score: number;
  confidence: number;
  risk_label: string;
  trend_direction: string;
  top_findings_count: number;
  high_severity_count: number;
  summary: string;
  verdict: string | null;
  key_findings: KeyFindingSnapshot[] | null;
}

function rowToSnapshot(r: Row): InvestigationSnapshot {
  return {
    id: r.id,
    entityIdentifier: r.entity_identifier,
    entityLabel: r.entity_label,
    entityType: r.entity_type as EntityType,
    takenAt: r.taken_at,
    riskScore: r.risk_score,
    confidence: r.confidence,
    riskLabel: r.risk_label as RiskLabel,
    trendDirection: r.trend_direction as TrendDirection,
    topFindingsCount: r.top_findings_count,
    highSeverityCount: r.high_severity_count,
    summary: r.summary,
    verdict: (r.verdict as DecisionTier | null) ?? undefined,
    keyFindings: r.key_findings ?? undefined,
  };
}

function snapshotToRow(s: InvestigationSnapshot): Row {
  return {
    id: s.id,
    entity_identifier: s.entityIdentifier,
    entity_label: s.entityLabel,
    entity_type: s.entityType,
    taken_at: s.takenAt,
    risk_score: s.riskScore,
    confidence: s.confidence,
    risk_label: s.riskLabel,
    trend_direction: s.trendDirection,
    top_findings_count: s.topFindingsCount,
    high_severity_count: s.highSeverityCount,
    summary: s.summary,
    verdict: s.verdict ?? null,
    key_findings: s.keyFindings ?? null,
  };
}

export class SupabaseSnapshotStore implements SnapshotStore {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  private table() {
    return this.client.from(TABLE) as ReturnType<typeof this.client.from>;
  }

  async record(snapshot: InvestigationSnapshot): Promise<void> {
    await this.table().insert(snapshotToRow(snapshot) as never);
  }

  async list(entityIdentifier: string): Promise<InvestigationSnapshot[]> {
    const { data } = await this.table()
      .select("*")
      .eq("entity_identifier", entityIdentifier)
      .order("taken_at", { ascending: true });
    return ((data ?? []) as Row[]).map(rowToSnapshot);
  }

  async listAll(): Promise<InvestigationSnapshot[]> {
    const { data } = await this.table()
      .select("*")
      .order("taken_at", { ascending: false });
    return ((data ?? []) as Row[]).map(rowToSnapshot);
  }

  async listLatestPerEntity(): Promise<InvestigationSnapshot[]> {
    const all = await this.listAll();
    const map = new Map<string, InvestigationSnapshot>();
    for (const s of all) {
      const cur = map.get(s.entityIdentifier);
      if (!cur || new Date(s.takenAt) > new Date(cur.takenAt)) {
        map.set(s.entityIdentifier, s);
      }
    }
    return [...map.values()];
  }

  async remove(entityIdentifier: string): Promise<void> {
    await this.table().delete().eq("entity_identifier", entityIdentifier);
  }

  async clear(): Promise<void> {
    await this.table().delete().not("id", "is", null);
  }
}
