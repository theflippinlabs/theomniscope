/** Shared types for Wallet Cluster Engine */

export interface ClusterReason {
  signal: ClusterSignalType;
  label: string;
  detail: string;
  evidence: string[];
  weight: number;
}

export type ClusterSignalType =
  | "shared_funding"
  | "timing_correlation"
  | "strong_interaction"
  | "common_contract"
  | "bridge_pattern";

export type ClusterMemberRole = "core" | "associated";

export interface ClusterMember {
  address: string;
  role: ClusterMemberRole;
  confidence: number;
  reasons: ClusterReason[];
}

export interface ClusterEdge {
  source: string;
  target: string;
  weight: number;
  netFlow: number;
  txCount: number;
  timeWindow: string;
}

export interface ClusterSummary {
  size: number;
  topSignals: string[];
  keyEvidence: string[];
}

export interface ClusterResponse {
  clusterId: string;
  chain: string;
  confidence: number;
  label: string | null;
  seedAddress: string;
  seedType: "wallet" | "token";
  members: ClusterMember[];
  edges: ClusterEdge[];
  summary: ClusterSummary;
}
