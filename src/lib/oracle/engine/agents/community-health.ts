import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * Community Health Agent
 *
 * Optionally integrates with Discord/Telegram/Farcaster feeds. When no
 * integration is connected, the agent reports `partial` status and
 * works on proxy signals only.
 */
export class CommunityHealthAgent extends BaseAgent {
  readonly name = "Community Health";
  readonly version = "1.1.0";

  appliesTo(_t: EntityType): boolean {
    return true;
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const snap = ctx.providers.community.fetch(
      ctx.entity.identifier,
      ctx.entity.label,
      ctx.entity.type,
    );

    if (snap.integrationConnected) {
      b.setStatus("ok").setConfidence(75, "live community feed connected");
    } else {
      b.setStatus("partial").setConfidence(40, "running on proxy signals only");
      b.addFinding({
        title: "Direct community feed not connected",
        description:
          "Oracle can ingest a Discord/Telegram feed when configured. Running on proxy signals only.",
        severity: "info",
        category: "Integration",
      });
    }

    if (snap.modActivity < 35) {
      b.addNegative(12).addFinding({
        title: "Low moderation activity",
        description:
          "Inactive moderation correlates with spam surges and rug-pull preparation windows.",
        severity: "medium",
        category: "Moderation",
      });
    } else {
      b.addPositive(8).addFinding({
        title: "Active moderation cadence",
        description: "Rolling moderation heuristics within healthy range.",
        severity: "info",
        category: "Moderation",
      });
    }

    if (snap.supportResponsiveness < 40) {
      b.addNegative(10).addFinding({
        title: "Slow support responsiveness",
        description: "Users reporting issues are not receiving timely replies.",
        severity: "low",
        category: "Support",
      });
    }

    if (snap.anomalyIndex > 75) {
      b.addNegative(14)
        .addAlert({
          title: "Community anomaly",
          level: "medium",
          reason: "Unusual moderator or membership activity detected.",
        })
        .addFinding({
          title: "Community anomaly detected",
          description:
            "Sudden shift in member churn, message tone, or role assignments.",
          severity: "medium",
          category: "Anomaly",
        });
    }

    b.addEvidence({
      type: "metric",
      label: "Mod activity",
      value: `${snap.modActivity}/100`,
      source: snap.source,
      confidence: snap.integrationConnected ? 80 : 45,
    })
      .addEvidence({
        type: "metric",
        label: "Support responsiveness",
        value: `${snap.supportResponsiveness}/100`,
        source: snap.source,
        confidence: snap.integrationConnected ? 80 : 45,
      })
      .addEvidence({
        type: "metric",
        label: "Anomaly index",
        value: `${snap.anomalyIndex}/100`,
        source: snap.source,
        confidence: snap.integrationConnected ? 80 : 45,
      })
      .addEvidence({
        type: "label",
        label: "Integration",
        value: snap.integrationConnected ? "Connected" : "Proxy signals only",
        source: snap.source,
        confidence: 100,
      });

    b.setSummary(
      snap.integrationConnected
        ? "Community telemetry analyzed directly from connected integration."
        : "Community assessment running on proxy signals — connect an integration for stronger confidence.",
    );
  }
}
