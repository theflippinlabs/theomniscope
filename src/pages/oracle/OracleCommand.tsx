import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Coins,
  FileText,
  Image as ImageIcon,
  Radar,
  Scan,
  Wallet,
} from "lucide-react";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import {
  OracleCard,
  SectionHeader,
} from "@/components/oracle/primitives";
import { CompactScoreBadge, ConfidenceBar } from "@/components/oracle/ScoreBadge";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";

export default function OracleCommand() {
  const { entries } = useAnalysisHistory();
  const recent = entries.slice(0, 3);

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Command Center
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">
            Oracle is online. Run an analysis.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Paste any wallet, token contract, or NFT collection. The Command
            Brain will dispatch the right specialized agents and return a
            scored, transparent report.
          </p>
        </div>
        <EntitySearch autoFocus large />
        <QuickActionBar />
      </header>

      {/* Recent analyses — populated from real history, not fixtures */}
      <section>
        <SectionHeader
          eyebrow="Recent analyses"
          title={recent.length > 0 ? "Your latest reports" : "No analyses yet"}
        />
        {recent.length === 0 ? (
          <OracleCard className="mt-5 p-8 text-center">
            <Radar className="mx-auto h-8 w-8 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-400">
              Paste an address above to run your first analysis. Every result
              is saved to your history automatically.
            </p>
          </OracleCard>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((entry) => (
              <Link
                key={entry.id}
                to="/app/history"
                className="block transition hover:scale-[1.01]"
              >
                <OracleCard className="p-5 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        {entry.entityType}
                      </div>
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {entry.entityLabel}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500">
                        {entry.chain} ·{" "}
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <CompactScoreBadge score={entry.riskScore} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {entry.executiveSummary}
                  </p>
                  <div className="mt-4">
                    <ConfidenceBar confidence={entry.confidence} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {entry.mode === "forensic" && (
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300">
                        forensic
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-sky-300">
                      View <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </OracleCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickActionBar() {
  const actions = [
    { to: "/app/wallet", label: "Analyze Wallet", icon: <Wallet className="h-3.5 w-3.5" /> },
    { to: "/app/token", label: "Analyze Token", icon: <Coins className="h-3.5 w-3.5" /> },
    { to: "/app/nft", label: "Scan NFT", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { to: "/app/forensic", label: "Forensic Mode", icon: <Scan className="h-3.5 w-3.5" /> },
    { to: "/app/reports", label: "Generate Briefing", icon: <FileText className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
        >
          {a.icon}
          {a.label}
        </Link>
      ))}
    </div>
  );
}
