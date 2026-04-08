import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * On-Chain Analyst Agent
 *
 * Reads a wallet's balances, transactions, counterparties and tenure
 * to surface behavioral risk and hygiene findings.
 */
export class OnChainAnalystAgent extends BaseAgent {
  readonly name = "On-Chain Analyst";
  readonly version = "1.1.0";

  appliesTo(t: EntityType): boolean {
    return t === "wallet" || t === "mixed";
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const w = ctx.entity.wallet;
    if (!w) {
      b.degrade("No wallet snapshot available");
      return;
    }

    // Mixer-linked counterparty
    const mixer = w.counterparties.find((c) => c.category === "mixer");
    if (mixer) {
      b.addNegative(48)
        .addFinding({
          title: "Mixer-linked funding detected",
          description: `Counterparty ${mixer.label ?? mixer.address} is classified as a mixer or privacy relay (${mixer.txCount} tx, $${Math.round(mixer.volumeUsd).toLocaleString()}).`,
          severity: "high",
          category: "Counterparty",
        })
        .addAlert({
          title: "Mixer-origin funds",
          level: "high",
          reason: "Wallet received funds from a privacy mixer relay.",
        })
        .addEvidence({
          type: "counterparty",
          label: "Mixer counterparty volume",
          value: `$${Math.round(mixer.volumeUsd).toLocaleString()}`,
          source: "mock:counterparty-labels",
          confidence: 90,
        });
    }

    // Unknown counterparties
    const unknown = w.counterparties.filter((c) => c.category === "unknown");
    if (unknown.length > 0) {
      b.addNegative(6 * unknown.length)
        .addFinding({
          title: `${unknown.length} unlabeled counterparties`,
          description:
            "Interactions with contracts Oracle cannot currently classify. Not inherently risky, but reduces confidence.",
          severity: "low",
          category: "Counterparty",
        })
        .adjustConfidence(-4 * unknown.length, "unlabeled counterparties");
    }

    // Unlimited approvals
    const approvals = w.transactions.filter(
      (t) => t.flagged === "unlimited-approval",
    );
    if (approvals.length > 0) {
      b.addNegative(12).addFinding({
        title: "Unlimited token approvals granted",
        description:
          "Wallet has granted unlimited spend approvals. Recommend revoking on idle approvals.",
        severity: "medium",
        category: "Hygiene",
      });
    }

    // Concentration
    const sortedAssets = [...w.assets].sort((a, b) => b.valueUsd - a.valueUsd);
    const top = sortedAssets[0];
    if (top && w.totalValueUsd > 0) {
      const pct = top.valueUsd / w.totalValueUsd;
      if (pct > 0.7) {
        b.addNegative(8).addFinding({
          title: "High single-asset concentration",
          description: `${top.symbol} accounts for ${Math.round(pct * 100)}% of wallet value.`,
          severity: "low",
          category: "Concentration",
        });
      } else {
        b.addPositive(6).addFinding({
          title: "Diversified holdings",
          description: `Top asset ${top.symbol} is ${Math.round(pct * 100)}% of portfolio.`,
          severity: "info",
          category: "Concentration",
        });
      }
    }

    // Tenure / maturity
    const ageDays =
      (new Date(w.lastSeen).getTime() - new Date(w.firstSeen).getTime()) /
      (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      b.addNegative(14)
        .adjustConfidence(-6, "young wallet (<30d) — limited baseline")
        .addFinding({
          title: "Young wallet (<30 days)",
          description:
            "Wallet history is limited; behavioral baselines are less reliable.",
          severity: "low",
          category: "Maturity",
        });
    } else {
      b.addPositive(10).addFinding({
        title: "Mature wallet tenure",
        description: `First seen ${w.firstSeen}, active across ${Math.round(ageDays)} days with ${w.txCount.toLocaleString()} transactions.`,
        severity: "info",
        category: "Maturity",
      });
    }

    // Exchange exposure as a calming positive signal
    const exchangeFlow = w.counterparties
      .filter((c) => c.category === "exchange")
      .reduce((a, c) => a + c.volumeUsd, 0);
    if (exchangeFlow > 0) {
      b.addPositive(8).addEvidence({
        type: "metric",
        label: "Labeled exchange flow",
        value: `$${Math.round(exchangeFlow).toLocaleString()}`,
        source: "mock:counterparty-labels",
        confidence: 85,
      });
    }

    b.addEvidence({
      type: "metric",
      label: "Counterparties",
      value: w.uniqueCounterparties,
      source: "mock:wallet-fixture",
      confidence: 90,
    })
      .addEvidence({
        type: "metric",
        label: "Transactions",
        value: w.txCount,
        source: "mock:wallet-fixture",
        confidence: 90,
      })
      .addEvidence({
        type: "metric",
        label: "NFT holdings",
        value: w.nftCount,
        source: "mock:wallet-fixture",
        confidence: 88,
      })
      .addEvidence({
        type: "metric",
        label: "Portfolio USD",
        value: `$${Math.round(w.totalValueUsd).toLocaleString()}`,
        source: "mock:wallet-fixture",
        confidence: 88,
      });

    if (mixer) {
      b.setSummary(
        "Wallet shows mixer-origin funds and requires elevated scrutiny.",
      );
    } else {
      b.setSummary(
        "Wallet behavior appears consistent with labeled counterparty baselines.",
      );
    }

    if (b["confidenceReasons"] === undefined) {
      // builder has private state — this branch is unreachable, kept as a no-op
    }
  }
}
