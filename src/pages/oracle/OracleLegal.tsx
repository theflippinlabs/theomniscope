import { OraclePublicShell } from "@/components/oracle/OraclePublicShell";
import { OracleCard, SectionHeader } from "@/components/oracle/primitives";

export default function OracleLegal() {
  return (
    <OraclePublicShell>
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-16">
        <SectionHeader
          eyebrow="Legal"
          title="Disclaimers and limits"
          subtitle="Plain-language statements about what Oracle Sentinel is, and is not."
        />

        <OracleCard className="mt-10 p-6">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            Not financial advice
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Oracle Sentinel is an informational intelligence surface. Nothing
            produced by Oracle constitutes investment, legal, tax, or any other
            form of professional advice. Users are responsible for their own
            decisions and due diligence.
          </p>
        </OracleCard>

        <OracleCard className="mt-6 p-6">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            Informational use only
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            All scores, findings, alerts, reports, and summaries are
            observations on public data. Oracle Sentinel makes no claim of
            completeness or accuracy at any specific point in time. Markets
            change; signals change; Oracle's score at one moment does not bind
            its score at another.
          </p>
        </OracleCard>

        <OracleCard className="mt-6 p-6">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            Limitation of liability
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            To the fullest extent permitted by applicable law, Oracle Sentinel
            and its operators disclaim all liability for any loss, damage, or
            harm arising from reliance on information produced by the
            platform. By using Oracle Sentinel you agree that you use it at
            your own discretion and risk.
          </p>
        </OracleCard>

        <OracleCard className="mt-6 p-6">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            No custody, no signing, no wallet access
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Oracle Sentinel never takes custody of any funds, does not sign
            transactions on behalf of any user, and does not request private
            keys, seed phrases, or wallet connections in order to answer
            queries on the public surface.
          </p>
        </OracleCard>

        <OracleCard className="mt-6 p-6">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            Contact
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            For questions about this notice, contact the Oracle Sentinel
            operators through the published channels listed on the main site
            footer.
          </p>
        </OracleCard>
      </section>
    </OraclePublicShell>
  );
}
