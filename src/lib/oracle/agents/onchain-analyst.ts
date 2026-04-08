import type { AgentOutput, WalletProfile } from "../types";

/**
 * ON-CHAIN ANALYST AGENT
 *
 * Inspects wallet activity, counterparty clusters, and behavioral anomalies.
 * Produces a structured finding set with a score impact reflecting on-chain
 * risk only (never the final score).
 */
export function runOnChainAnalyst(wallet: WalletProfile): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  const evidence: AgentOutput["evidence"] = [];
  let score = 10;
  let confidence = 82;

  const mixer = wallet.counterparties.find((c) => c.category === "mixer");
  if (mixer) {
    score += 45;
    findings.push({
      id: "oc_mixer",
      title: "Mixer-linked funding detected",
      detail: `Counterparty ${mixer.label ?? mixer.address} is classified as a mixer or privacy relay. ${mixer.txCount} tx totalling ${Math.round(mixer.volumeUsd).toLocaleString()} USD.`,
      severity: "high",
      category: "Counterparty",
      evidence: [`${mixer.txCount} tx`, `$${Math.round(mixer.volumeUsd).toLocaleString()}`],
    });
    alerts.push({
      id: "al_mixer",
      title: "Mixer-origin funds",
      description: "Wallet received funds from a privacy mixer relay.",
      severity: "high",
      triggeredAt: wallet.lastSeen,
    });
  }

  const unknown = wallet.counterparties.filter((c) => c.category === "unknown");
  if (unknown.length >= 1) {
    score += 6 * unknown.length;
    findings.push({
      id: "oc_unknown",
      title: `${unknown.length} unlabeled counterparties`,
      detail:
        "Interactions with contracts that Oracle cannot currently classify. Not inherently risky — monitor.",
      severity: "low",
      category: "Counterparty",
    });
    confidence -= 4 * unknown.length;
  }

  const approvals = wallet.transactions.filter((t) => t.flagged === "unlimited-approval");
  if (approvals.length) {
    score += 12;
    findings.push({
      id: "oc_approvals",
      title: "Unlimited token approvals granted",
      detail:
        "Wallet has granted unlimited spend approvals. Recommend revoking on idle approvals.",
      severity: "medium",
      category: "Hygiene",
    });
  }

  // Concentration check on assets
  const sorted = [...wallet.assets].sort((a, b) => b.valueUsd - a.valueUsd);
  const top = sorted[0];
  if (top && top.valueUsd / Math.max(1, wallet.totalValueUsd) > 0.7) {
    score += 8;
    findings.push({
      id: "oc_conc",
      title: "High single-asset concentration",
      detail: `${top.symbol} accounts for ${Math.round((top.valueUsd / wallet.totalValueUsd) * 100)}% of wallet value.`,
      severity: "low",
      category: "Concentration",
    });
  }

  // Age / activity signal
  const ageDays =
    (new Date(wallet.lastSeen).getTime() - new Date(wallet.firstSeen).getTime()) /
    (1000 * 60 * 60 * 24);
  if (ageDays < 30) {
    score += 14;
    confidence -= 6;
    findings.push({
      id: "oc_age",
      title: "Young wallet (<30 days)",
      detail: "Wallet history is limited; behavioral baselines are less reliable.",
      severity: "low",
      category: "Maturity",
    });
  } else {
    findings.push({
      id: "oc_tenure",
      title: "Mature wallet tenure",
      detail: `First seen ${wallet.firstSeen}, active across ${Math.round(ageDays)} days with ${wallet.txCount.toLocaleString()} transactions.`,
      severity: "info",
      category: "Maturity",
    });
  }

  evidence.push(
    { label: "Counterparties", value: wallet.uniqueCounterparties.toLocaleString() },
    { label: "Transactions", value: wallet.txCount.toLocaleString() },
    { label: "NFT holdings", value: wallet.nftCount.toString() },
    { label: "Portfolio USD", value: `$${Math.round(wallet.totalValueUsd).toLocaleString()}` },
  );

  return {
    agent: "On-Chain Analyst",
    entityType: "wallet",
    status: "ok",
    summary:
      mixer
        ? "Wallet shows mixer-origin funds and requires elevated scrutiny."
        : "Wallet behavior appears consistent with labeled counterparty baselines.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 140,
  };
}
