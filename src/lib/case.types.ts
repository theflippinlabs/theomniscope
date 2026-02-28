/** Shared types for Case Management module */

export type CaseStatus = "open" | "triaged" | "closed";
export type CasePriority = "low" | "medium" | "high" | "critical";
export type CaseItemType = "wallet" | "token" | "tx" | "cluster" | "alert" | "note" | "snapshot";

export interface Case {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  chain: string;
  status: CaseStatus;
  priority: CasePriority;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CaseItem {
  id: string;
  case_id: string;
  item_type: CaseItemType;
  chain: string;
  ref: string;
  title: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CaseNote {
  id: string;
  case_id: string;
  body: string;
  created_at: string;
}

export interface CaseShareLink {
  id: string;
  case_id: string;
  public_token: string;
  is_enabled: boolean;
  created_at: string;
}

export interface ReportJob {
  id: string;
  case_id: string;
  status: "queued" | "running" | "done" | "failed";
  output_url: string | null;
  output_json_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  time: string;
  type: CaseItemType | "case_created" | "note";
  title: string;
  details: string;
  evidenceRefs: string[];
}
