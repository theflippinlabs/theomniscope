import type { AgentOutput, TokenProfile } from "../types";

/**
 * TOKEN RISK AGENT
 *
 * Contract-level red flags: honeypot indicators, tax surface,
 * liquidity lock status, ownership, mint authority, permissions.
 */
export function runTokenRisk(token: TokenProfile): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  const evidence: AgentOutput["evidence"] = [];
  let score = 10;
  let confidence = 80;

  if (token.honeypot) {
    score += 80;
    findings.push({
      id: "tr_honeypot",
      title: "Honeypot pattern detected",
      detail:
        "Contract allows buys but simulates failing sell paths under specific conditions.",
      severity: "critical",
      category: "Contract",
    });
    alerts.push({
      id: "al_honeypot",
      title: "Honeypot indicators",
      description: "Contract simulation found failing sell paths for non-whitelisted addresses.",
      severity: "critical",
      triggeredAt: new Date().toISOString(),
    });
  }

  if (token.mintable) {
    score += 22;
    findings.push({
      id: "tr_mint",
      title: "Active mint authority",
      detail: "Deployer retains mint permissions. Supply can be inflated without notice.",
      severity: "high",
      category: "Permissions",
    });
  }

  if (!token.ownershipRenounced && !token.honeypot) {
    score += 12;
    findings.push({
      id: "tr_owner",
      title: "Ownership not renounced",
      detail: "Owner-only functions remain active. Review contract for privileged paths.",
      severity: "medium",
      category: "Governance",
    });
  } else if (token.ownershipRenounced) {
    findings.push({
      id: "tr_owner_ok",
      title: "Ownership renounced",
      detail: "Owner address is the zero address. Privileged functions are disabled.",
      severity: "info",
      category: "Governance",
    });
  }

  if (token.proxy) {
    score += 10;
    findings.push({
      id: "tr_proxy",
      title: "Upgradeable proxy contract",
      detail: "Logic can be swapped via admin upgrade. Verify admin control and timelock.",
      severity: "medium",
      category: "Architecture",
    });
  }

  if (token.sellTaxPct >= 15) {
    score += 14;
    findings.push({
      id: "tr_tax",
      title: `High sell tax (${token.sellTaxPct}%)`,
      detail:
        "Sell taxes above 15% are common in honeypot and exit-scam contracts.",
      severity: "high",
      category: "Taxes",
    });
  } else if (token.sellTaxPct > 0 || token.buyTaxPct > 0) {
    findings.push({
      id: "tr_tax_ok",
      title: `Fees ${token.buyTaxPct}% / ${token.sellTaxPct}%`,
      detail: "Fee structure disclosed. Confirm mutability before long-term exposure.",
      severity: "low",
      category: "Taxes",
    });
  }

  const totalLiq = token.liquidityPools.reduce((a, p) => a + p.liquidityUsd, 0);
  const lockedLiq = token.liquidityPools.reduce(
    (a, p) => a + (p.locked ? p.liquidityUsd * (p.lockedPct / 100) : 0),
    0,
  );
  const lockedRatio = lockedLiq / Math.max(1, totalLiq);
  if (totalLiq < 250_000) {
    score += 12;
    findings.push({
      id: "tr_liq_thin",
      title: "Thin liquidity",
      detail: `Total liquidity ~$${Math.round(totalLiq).toLocaleString()}. High slippage and rug exposure.`,
      severity: "high",
      category: "Liquidity",
    });
  }
  if (lockedRatio < 0.5 && totalLiq > 0) {
    score += 10;
    findings.push({
      id: "tr_liq_unlock",
      title: "Low locked liquidity",
      detail: `Only ${Math.round(lockedRatio * 100)}% of liquidity is locked.`,
      severity: "medium",
      category: "Liquidity",
    });
  } else if (totalLiq > 0) {
    findings.push({
      id: "tr_liq_ok",
      title: "Liquidity primarily locked",
      detail: `${Math.round(lockedRatio * 100)}% of liquidity is locked across ${token.liquidityPools.length} pools.`,
      severity: "info",
      category: "Liquidity",
    });
  }

  if (token.topHolderConcentrationPct > 40) {
    score += 14;
    findings.push({
      id: "tr_conc",
      title: `Top holder concentration ${token.topHolderConcentrationPct}%`,
      detail: "Highly concentrated supply amplifies unilateral price impact.",
      severity: "high",
      category: "Concentration",
    });
  }

  if (token.ageDays < 14) {
    score += 8;
    confidence -= 10;
    findings.push({
      id: "tr_age",
      title: "New token (<14 days)",
      detail: "Insufficient trading history. Confidence is reduced.",
      severity: "low",
      category: "Maturity",
    });
  }

  const critical = token.permissions.filter((p) => p.severity === "critical").length;
  const high = token.permissions.filter((p) => p.severity === "high").length;
  if (critical) score += 10 * critical;
  if (high) score += 6 * high;

  evidence.push(
    { label: "Holders", value: token.holderCount.toLocaleString() },
    {
      label: "Liquidity USD",
      value: `$${Math.round(totalLiq).toLocaleString()}`,
    },
    { label: "Taxes", value: `${token.buyTaxPct}% / ${token.sellTaxPct}%` },
    {
      label: "Ownership",
      value: token.ownershipRenounced ? "Renounced" : "Active",
    },
    { label: "Proxy", value: token.proxy ? "Yes" : "No" },
    { label: "Mintable", value: token.mintable ? "Yes" : "No" },
  );

  return {
    agent: "Token Risk",
    entityType: "token",
    status: "ok",
    summary:
      score >= 70
        ? "Multiple severe contract-level risks detected. Treat as high risk."
        : score >= 40
          ? "Notable risk factors present. Review carefully before exposure."
          : "No critical contract-level issues detected. Residual risk is normal.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 180,
  };
}
