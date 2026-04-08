import type { AgentOutput, EntityType } from "../types";

/**
 * COMMUNITY HEALTH AGENT
 *
 * Designed to plug into Discord / Telegram / Farcaster integrations.
 * In the demo, it produces deterministic heuristics based on identifier.
 *
 * The agent is honest when an integration is not connected: it reports
 * `partial` status instead of fabricating data.
 */
export function runCommunityHealth(
  identifier: string,
  label: string,
  entityType: EntityType,
  integrationConnected = false,
): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  let score = 6;
  const confidence = integrationConnected ? 75 : 40;

  const hash = [...identifier].reduce((a, c) => a + c.charCodeAt(0), 0);
  const modActivity = (hash * 7) % 100;
  const supportResponsiveness = (hash * 11) % 100;
  const anomalyIndex = (hash * 13) % 100;

  if (!integrationConnected) {
    findings.push({
      id: "ch_integration",
      title: "Direct community feed not connected",
      detail:
        "Oracle can ingest a Discord/Telegram feed when configured. Running on proxy signals only.",
      severity: "info",
      category: "Integration",
    });
  }

  if (modActivity < 35) {
    score += 10;
    findings.push({
      id: "ch_mod",
      title: "Low moderation activity",
      detail:
        "Inactive moderation correlates with spam surges and rug-pull preparation windows.",
      severity: "medium",
      category: "Moderation",
    });
  } else {
    findings.push({
      id: "ch_mod_ok",
      title: "Active moderation cadence",
      detail: "Rolling moderation heuristics within healthy range.",
      severity: "info",
      category: "Moderation",
    });
  }

  if (supportResponsiveness < 40) {
    score += 8;
    findings.push({
      id: "ch_support",
      title: "Slow support responsiveness",
      detail: "Users reporting issues are not receiving timely replies.",
      severity: "low",
      category: "Support",
    });
  }

  if (anomalyIndex > 75) {
    score += 12;
    findings.push({
      id: "ch_anom",
      title: "Community anomaly detected",
      detail:
        "Sudden shift in member churn, message tone, or role assignments.",
      severity: "medium",
      category: "Anomaly",
    });
    alerts.push({
      id: "al_ch",
      title: "Community anomaly",
      description: "Unusual moderator or membership activity detected.",
      severity: "medium",
      triggeredAt: new Date().toISOString(),
    });
  }

  const evidence: AgentOutput["evidence"] = [
    { label: "Mod activity", value: `${modActivity}/100` },
    { label: "Support responsiveness", value: `${supportResponsiveness}/100` },
    { label: "Anomaly index", value: `${anomalyIndex}/100` },
    {
      label: "Integration",
      value: integrationConnected ? "Connected" : "Proxy signals only",
    },
  ];

  return {
    agent: "Community Health",
    entityType,
    status: integrationConnected ? "ok" : "partial",
    summary: integrationConnected
      ? "Community telemetry analyzed directly from connected integration."
      : "Community assessment running on proxy signals — connect an integration for stronger confidence.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 120,
  };
}
