import type { AgentOutput, EntityType } from "../types";

interface SocialSample {
  identifier: string;
  label: string;
  engagement: number; // 0..100 synthetic
  frequency: number; // posts per week
  authenticity: number; // 0..100
  hypeRatio: number; // 0..1
  narrativeShiftPct: number; // -100..+100
}

/**
 * Heuristic narrative/communication review.
 * In production this would route through social enrichment APIs;
 * in the demo, deterministic samples are derived from the identifier.
 */
function sample(identifier: string, label: string): SocialSample {
  const hash = [...identifier].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (mod: number) => ((hash * 9301 + 49297) % 233280) / 233280 * mod;
  return {
    identifier,
    label,
    engagement: Math.round(40 + r(55)),
    frequency: +(2 + r(9)).toFixed(1),
    authenticity: Math.round(45 + r(45)),
    hypeRatio: +(r(1)).toFixed(2),
    narrativeShiftPct: Math.round(-30 + r(60)),
  };
}

export function runSocialSignal(
  identifier: string,
  label: string,
  entityType: EntityType,
): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  let score = 8;
  let confidence = 62; // social signal is never fully reliable

  const s = sample(identifier, label);

  if (s.hypeRatio > 0.68) {
    score += 12;
    findings.push({
      id: "ss_hype",
      title: "Hype-heavy narrative",
      detail: `Communication skews promotional (${Math.round(s.hypeRatio * 100)}%). Verify substance behind announcements.`,
      severity: "medium",
      category: "Narrative",
    });
  } else {
    findings.push({
      id: "ss_hype_ok",
      title: "Balanced narrative",
      detail: `Promotional content is within normal ranges (${Math.round(s.hypeRatio * 100)}%).`,
      severity: "info",
      category: "Narrative",
    });
  }

  if (s.authenticity < 55) {
    score += 10;
    findings.push({
      id: "ss_auth",
      title: "Lower authenticity signal",
      detail: `Engagement quality heuristics suggest amplification or low-trust voices.`,
      severity: "medium",
      category: "Trust",
    });
  }

  if (s.narrativeShiftPct < -20) {
    score += 8;
    findings.push({
      id: "ss_drop",
      title: "Narrative retraction",
      detail: `Communication frequency dropped ${Math.abs(s.narrativeShiftPct)}% week-over-week.`,
      severity: "medium",
      category: "Silence",
    });
    alerts.push({
      id: "al_silence",
      title: "Narrative silence",
      description: "Project communications are declining meaningfully.",
      severity: "medium",
      triggeredAt: new Date().toISOString(),
    });
  } else if (s.narrativeShiftPct > 20) {
    findings.push({
      id: "ss_spike",
      title: "Narrative acceleration",
      detail: `Communication frequency up ${s.narrativeShiftPct}% week-over-week.`,
      severity: "low",
      category: "Narrative",
    });
  }

  if (s.engagement < 50) {
    score += 5;
    confidence -= 5;
  }

  const evidence: AgentOutput["evidence"] = [
    { label: "Engagement", value: `${s.engagement}/100` },
    { label: "Posts / week", value: s.frequency.toString() },
    { label: "Authenticity", value: `${s.authenticity}/100` },
    { label: "Hype ratio", value: `${Math.round(s.hypeRatio * 100)}%` },
    { label: "Narrative shift", value: `${s.narrativeShiftPct}% w/w` },
  ];

  return {
    agent: "Social Signal",
    entityType,
    status: "ok",
    summary:
      s.authenticity < 55 || s.hypeRatio > 0.68
        ? "Narrative shows amplification or hype bias. Treat claims cautiously."
        : "Communication pattern looks substantive and consistent.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 160,
  };
}
