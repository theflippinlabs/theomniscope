import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * Social Signal Agent
 *
 * Reads narrative cadence, hype ratio, and engagement quality via the
 * SocialDataProvider. Social signals are deliberately lower-confidence
 * than on-chain or contract findings.
 */
export class SocialSignalAgent extends BaseAgent {
  readonly name = "Social Signal";
  readonly version = "1.1.0";

  appliesTo(_t: EntityType): boolean {
    return true;
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const snap = ctx.providers.social.fetch(
      ctx.entity.identifier,
      ctx.entity.label,
      ctx.entity.type,
    );

    b.setConfidence(62, "social signals are inherently lower confidence");

    if (snap.hypeRatio > 0.68) {
      b.addNegative(14).addFinding({
        title: "Hype-heavy narrative",
        description: `Communication skews promotional (${Math.round(snap.hypeRatio * 100)}%). Verify substance behind announcements.`,
        severity: "medium",
        category: "Narrative",
      });
    } else {
      b.addPositive(8).addFinding({
        title: "Balanced narrative",
        description: `Promotional content within normal ranges (${Math.round(snap.hypeRatio * 100)}%).`,
        severity: "info",
        category: "Narrative",
      });
    }

    if (snap.authenticity < 55) {
      b.addNegative(12).addFinding({
        title: "Lower authenticity signal",
        description:
          "Engagement quality heuristics suggest amplification or low-trust voices.",
        severity: "medium",
        category: "Trust",
      });
    } else {
      b.addPositive(6);
    }

    if (snap.narrativeShiftPct < -20) {
      b.addNegative(10)
        .addAlert({
          title: "Narrative silence",
          level: "medium",
          reason: "Project communications are declining meaningfully.",
        })
        .addFinding({
          title: "Narrative retraction",
          description: `Communication frequency dropped ${Math.abs(snap.narrativeShiftPct)}% week-over-week.`,
          severity: "medium",
          category: "Silence",
        });
    } else if (snap.narrativeShiftPct > 20) {
      b.addNeutral(6).addFinding({
        title: "Narrative acceleration",
        description: `Communication frequency up ${snap.narrativeShiftPct}% week-over-week.`,
        severity: "low",
        category: "Narrative",
      });
    }

    if (snap.engagement < 50) {
      b.addNegative(6).adjustConfidence(-5, "thin engagement signal");
    }

    b.addEvidence({
      type: "metric",
      label: "Engagement",
      value: `${snap.engagement}/100`,
      source: snap.source,
      confidence: 60,
    })
      .addEvidence({
        type: "metric",
        label: "Posts / week",
        value: snap.frequency,
        source: snap.source,
        confidence: 60,
      })
      .addEvidence({
        type: "metric",
        label: "Authenticity",
        value: `${snap.authenticity}/100`,
        source: snap.source,
        confidence: 55,
      })
      .addEvidence({
        type: "ratio",
        label: "Hype ratio",
        value: `${Math.round(snap.hypeRatio * 100)}%`,
        source: snap.source,
        confidence: 60,
      })
      .addEvidence({
        type: "metric",
        label: "Narrative shift",
        value: `${snap.narrativeShiftPct}% w/w`,
        source: snap.source,
        confidence: 55,
      });

    if (snap.authenticity < 55 || snap.hypeRatio > 0.68) {
      b.setSummary(
        "Narrative shows amplification or hype bias. Treat claims cautiously.",
      );
    } else {
      b.setSummary("Communication pattern looks substantive and consistent.");
    }
  }
}
