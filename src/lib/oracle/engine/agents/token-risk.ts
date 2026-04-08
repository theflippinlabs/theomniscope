import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * Token Risk Agent
 *
 * Inspects a token contract: ownership, mint authority, tax surface,
 * liquidity lock state, holder concentration, and contract architecture.
 */
export class TokenRiskAgent extends BaseAgent {
  readonly name = "Token Risk";
  readonly version = "1.1.0";

  appliesTo(t: EntityType): boolean {
    return t === "token" || t === "mixed";
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const t = ctx.entity.token;
    if (!t) {
      b.degrade("No token snapshot available");
      return;
    }

    if (t.honeypot) {
      b.addNegative(85)
        .addAlert({
          title: "Honeypot indicators",
          level: "critical",
          reason: "Contract simulation found failing sell paths.",
        })
        .addFinding({
          title: "Honeypot pattern detected",
          description:
            "Contract allows buys but simulates failing sell paths under specific conditions.",
          severity: "critical",
          category: "Contract",
        });
    }

    if (t.mintable) {
      b.addNegative(28).addFinding({
        title: "Active mint authority",
        description:
          "Deployer retains mint permissions. Supply can be inflated without notice.",
        severity: "high",
        category: "Permissions",
      });
    }

    if (t.ownershipRenounced) {
      b.addPositive(20).addFinding({
        title: "Ownership renounced",
        description:
          "Owner address is the zero address. Privileged functions are disabled.",
        severity: "info",
        category: "Governance",
      });
    } else if (!t.honeypot) {
      b.addNegative(14).addFinding({
        title: "Ownership not renounced",
        description:
          "Owner-only functions remain active. Review contract for privileged paths.",
        severity: "medium",
        category: "Governance",
      });
    }

    if (t.proxy) {
      b.addNegative(12).addFinding({
        title: "Upgradeable proxy contract",
        description:
          "Logic can be swapped via admin upgrade. Verify admin control and timelock.",
        severity: "medium",
        category: "Architecture",
      });
    }

    if (t.sellTaxPct >= 15) {
      b.addNegative(18).addFinding({
        title: `High sell tax (${t.sellTaxPct}%)`,
        description:
          "Sell taxes above 15% are common in honeypot and exit-scam contracts.",
        severity: "high",
        category: "Taxes",
      });
    } else if (t.sellTaxPct > 0 || t.buyTaxPct > 0) {
      b.addFinding({
        title: `Fees ${t.buyTaxPct}% / ${t.sellTaxPct}%`,
        description:
          "Fee structure disclosed. Confirm mutability before long-term exposure.",
        severity: "low",
        category: "Taxes",
      });
    } else {
      b.addPositive(8).addFinding({
        title: "No transfer fees",
        description: "Buy/sell taxes are 0%.",
        severity: "info",
        category: "Taxes",
      });
    }

    // Liquidity
    const totalLiq = t.liquidityPools.reduce((a, p) => a + p.liquidityUsd, 0);
    const lockedLiq = t.liquidityPools.reduce(
      (a, p) => a + (p.locked ? p.liquidityUsd * (p.lockedPct / 100) : 0),
      0,
    );
    const lockedRatio = totalLiq > 0 ? lockedLiq / totalLiq : 0;

    if (totalLiq < 250_000) {
      b.addNegative(16).addFinding({
        title: "Thin liquidity",
        description: `Total liquidity ~$${Math.round(totalLiq).toLocaleString()}. High slippage and rug exposure.`,
        severity: "high",
        category: "Liquidity",
      });
    }
    if (lockedRatio < 0.5 && totalLiq > 0) {
      b.addNegative(12).addFinding({
        title: "Low locked liquidity",
        description: `Only ${Math.round(lockedRatio * 100)}% of liquidity is locked.`,
        severity: "medium",
        category: "Liquidity",
      });
    } else if (totalLiq > 0) {
      b.addPositive(14).addFinding({
        title: "Liquidity primarily locked",
        description: `${Math.round(lockedRatio * 100)}% of liquidity locked across ${t.liquidityPools.length} pools.`,
        severity: "info",
        category: "Liquidity",
      });
    }

    if (t.topHolderConcentrationPct > 40) {
      b.addNegative(16).addFinding({
        title: `Top holder concentration ${t.topHolderConcentrationPct}%`,
        description:
          "Highly concentrated supply amplifies unilateral price impact.",
        severity: "high",
        category: "Concentration",
      });
    } else if (t.topHolderConcentrationPct < 25) {
      b.addPositive(8).addFinding({
        title: "Healthy holder distribution",
        description: `Top holder concentration ${t.topHolderConcentrationPct}%.`,
        severity: "info",
        category: "Concentration",
      });
    }

    if (t.ageDays < 14) {
      b.addNegative(10)
        .adjustConfidence(-12, "new token (<14d)")
        .addFinding({
          title: "New token (<14 days)",
          description:
            "Insufficient trading history. Confidence is reduced.",
          severity: "low",
          category: "Maturity",
        });
    }

    // Critical / high permissions
    const critical = t.permissions.filter((p) => p.severity === "critical").length;
    const high = t.permissions.filter((p) => p.severity === "high").length;
    if (critical) b.addNegative(10 * critical);
    if (high) b.addNegative(6 * high);

    b.addEvidence({
      type: "metric",
      label: "Holders",
      value: t.holderCount,
      source: "mock:token-fixture",
      confidence: 92,
    })
      .addEvidence({
        type: "metric",
        label: "Liquidity USD",
        value: `$${Math.round(totalLiq).toLocaleString()}`,
        source: "mock:token-fixture",
        confidence: 90,
      })
      .addEvidence({
        type: "metric",
        label: "Buy/Sell tax",
        value: `${t.buyTaxPct}% / ${t.sellTaxPct}%`,
        source: "mock:token-fixture",
        confidence: 95,
      })
      .addEvidence({
        type: "label",
        label: "Ownership",
        value: t.ownershipRenounced ? "Renounced" : "Active",
        source: "mock:token-fixture",
        confidence: 95,
      })
      .addEvidence({
        type: "label",
        label: "Proxy",
        value: t.proxy ? "Yes" : "No",
        source: "mock:token-fixture",
        confidence: 95,
      })
      .addEvidence({
        type: "label",
        label: "Mintable",
        value: t.mintable ? "Yes" : "No",
        source: "mock:token-fixture",
        confidence: 95,
      });

    if (t.honeypot || critical > 0) {
      b.setSummary(
        "Critical contract-level failure detected. Treat as unsafe.",
      );
    } else if (t.mintable || !t.ownershipRenounced || lockedRatio < 0.5) {
      b.setSummary(
        "Multiple notable contract risks present. Review carefully before exposure.",
      );
    } else {
      b.setSummary(
        "No critical contract-level issues detected. Residual risk is normal.",
      );
    }
  }
}
