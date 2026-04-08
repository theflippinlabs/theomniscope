import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CircuitBoard,
  Coins,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  LineChart,
  MessageSquare,
  Network,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { OraclePublicShell } from "@/components/oracle/OraclePublicShell";
import { EntitySearch } from "@/components/oracle/EntitySearch";
import { IntelligencePanel } from "@/components/oracle/IntelligencePanel";
import {
  OracleCard,
  OracleDivider,
  SectionHeader,
} from "@/components/oracle/primitives";
import { DEMO_REPORTS } from "@/lib/oracle/demo-reports";
import { FindingsList } from "@/components/oracle/FindingsList";
import { CompactScoreBadge } from "@/components/oracle/ScoreBadge";
import { useState } from "react";

const PILLARS = [
  {
    icon: <Radar className="h-4 w-4" />,
    title: "Detect risk early",
    body: "Contract, liquidity, and behavioral signals scored the moment they surface — not after the exit.",
  },
  {
    icon: <Brain className="h-4 w-4" />,
    title: "Understand wallets and ecosystems faster",
    body: "Nine specialized agents read on-chain data, social narrative, and community health in parallel.",
  },
  {
    icon: <Target className="h-4 w-4" />,
    title: "Turn noise into decisions",
    body: "Every analysis produces a transparent score, a confidence, a reason, and a recommended next action.",
  },
];

const MODULES = [
  { icon: <Wallet className="h-4 w-4" />, title: "Wallet Analyzer", desc: "Holdings, flows, counterparties, behavioral risk." },
  { icon: <Coins className="h-4 w-4" />, title: "Token Risk", desc: "Contract, permissions, tax, liquidity, ownership." },
  { icon: <ImageIcon className="h-4 w-4" />, title: "NFT Monitoring", desc: "Collection health, wash-trade heuristics, narrative." },
  { icon: <MessageSquare className="h-4 w-4" />, title: "Social Signal Engine", desc: "Narrative quality, hype ratio, credibility heuristics." },
  { icon: <CircuitBoard className="h-4 w-4" />, title: "Pattern Detection", desc: "Temporal bursts, clustering, emerging threats." },
  { icon: <LineChart className="h-4 w-4" />, title: "Historical Oracle", desc: "Track record, prior calls, resolution status." },
  { icon: <Zap className="h-4 w-4" />, title: "Alerts & Watchlists", desc: "Score deltas, narrative shifts, concentration changes." },
  { icon: <FileText className="h-4 w-4" />, title: "AI Reports", desc: "Quick summary, executive briefing, full investigation." },
];

const STEPS = [
  { n: 1, title: "Data ingestion", body: "On-chain, contract, market, NFT, and social sources are normalized into structured inputs." },
  { n: 2, title: "Signal enrichment", body: "Labels, prior analyses, and risk history are attached before agents run." },
  { n: 3, title: "Agent evaluation", body: "Specialized agents run in parallel, each returning a structured finding schema." },
  { n: 4, title: "Risk scoring", body: "The Risk Scoring agent weights contributions by entity type and produces a score + confidence." },
  { n: 5, title: "Final synthesis", body: "The Report Synthesis agent produces an executive summary, context, and next actions." },
];

export default function OracleLanding() {
  return (
    <OraclePublicShell>
      <HeroSection />
      <PillarsSection />
      <LiveDemoSection />
      <HowItWorksSection />
      <ModulesSection />
      <TrustSection />
      <SecuritySection />
      <FinalCTASection />
    </OraclePublicShell>
  );
}

function HeroSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 md:pt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            <Sparkles className="h-3 w-3" />
            Oracle Sentinel · v2.4
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-50 md:text-6xl">
            Real-Time Web3 Intelligence.
            <br />
            <span className="bg-gradient-to-r from-sky-200 via-sky-300 to-white bg-clip-text text-transparent">
              Trusted Signals. No Noise.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
            Oracle Sentinel analyzes wallets, tokens, NFT ecosystems, and threat
            indicators in real time — combining on-chain data with a transparent
            multi-agent scoring system so decisions aren't guessed, they're
            reasoned.
          </p>
          <div className="mt-7 max-w-xl">
            <EntitySearch large />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <Link
              to="/app/command"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-200 transition hover:bg-white/[0.08]"
            >
              Run live analysis <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="#demo"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-zinc-400 transition hover:text-zinc-200"
            >
              View sample report
            </Link>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-600">
              <Shield className="h-3 w-3" />
              Read-only · No wallet access
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-400/10 via-transparent to-transparent blur-2xl" />
          <IntelligencePanel report={DEMO_REPORTS.walletRisky} />
        </div>
      </div>
    </section>
  );
}

function PillarsSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <OracleCard key={p.title} className="p-6">
            <div className="flex items-center gap-2 text-sky-300">
              {p.icon}
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                {p.title}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{p.body}</p>
          </OracleCard>
        ))}
      </div>
    </section>
  );
}

function LiveDemoSection() {
  const [tab, setTab] = useState<"wallet" | "token" | "nft">("token");
  const report =
    tab === "wallet"
      ? DEMO_REPORTS.wallet
      : tab === "token"
        ? DEMO_REPORTS.tokenRisky
        : DEMO_REPORTS.nftRisky;

  return (
    <section id="demo" className="mx-auto max-w-7xl px-6 py-20">
      <SectionHeader
        eyebrow="Public demo"
        title="See Oracle reason through a real analysis"
        subtitle="No login required. Switch entity types below to see how each agent contributes to a final score, a confidence, and a structured recommendation."
      />
      <div className="mt-8 flex items-center gap-2">
        {(["wallet", "token", "nft"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition ${
              tab === t
                ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {t === "wallet" ? "Wallet" : t === "token" ? "Token" : "NFT Collection"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IntelligencePanel report={report} />
        </div>
        <OracleCard className="p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Agent contributions
          </div>
          <ul className="mt-3 space-y-2">
            {report.agentOutputs
              .filter((o) => o.agent !== "Report Synthesis")
              .map((o) => (
                <li
                  key={o.agent + o.durationMs}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-100">
                      {o.agent}
                    </div>
                    <div className="line-clamp-1 text-[11px] text-zinc-500">
                      {o.summary}
                    </div>
                  </div>
                  <CompactScoreBadge score={o.scoreImpact} />
                </li>
              ))}
          </ul>
          <OracleDivider className="my-4" />
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Top findings
          </div>
          <div className="mt-3">
            <FindingsList findings={report.findings} limit={3} />
          </div>
        </OracleCard>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <SectionHeader
        eyebrow="How it works"
        title="From raw data to reasoned decisions"
        subtitle="Every analysis runs through the same five-stage pipeline. Each stage is inspectable, every output is structured, and nothing is hidden behind a black-box score."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-5">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="relative rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-sky-400/30 bg-sky-500/10 font-mono text-[11px] font-semibold text-sky-300">
                {s.n}
              </div>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="text-sm font-semibold text-zinc-100">{s.title}</div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="modules" className="mx-auto max-w-7xl px-6 py-20">
      <SectionHeader
        eyebrow="Modules"
        title="One command center. Nine specialized agents."
        subtitle="Oracle Sentinel is a single product, not a directory of dashboards. Each module is a view into the same underlying multi-agent system."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <div
            key={m.title}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-sky-400/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-2 text-sky-300">
              {m.icon}
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                {m.title}
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{m.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-sky-300">
              Explore <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <SectionHeader
        eyebrow="Trust"
        title="What Oracle can — and cannot — do"
        subtitle="Oracle is honest about its limits. That honesty is what makes the signal worth anything."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <OracleCard className="p-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            What Oracle can evaluate
          </div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400" />
              Observable on-chain behavior and counterparty labels.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400" />
              Contract-level permissions, tax surface, and liquidity lock state.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400" />
              NFT distribution, listing pressure, and wash-trade heuristics.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400" />
              Narrative cadence, hype ratio, and engagement quality.
            </li>
          </ul>
        </OracleCard>
        <OracleCard className="p-6">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
            What Oracle cannot guarantee
          </div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-300" />
              That a low-risk score means no risk exists.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-300" />
              That off-chain intentions match on-chain behavior.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-300" />
              That future prices or market outcomes will follow the signal.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-300" />
              That any finding constitutes financial advice.
            </li>
          </ul>
        </OracleCard>
      </div>
      <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Risk score
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              A 0–100 number representing how concerning the entity currently
              appears. Lower is calmer. It reflects observed signal, not
              prediction.
            </p>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Confidence
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              A 0–100 number representing how reliable the analysis is. Thin
              data, missing integrations, or young entities drop confidence —
              not the score.
            </p>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Read-only
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Oracle never signs transactions, never touches keys, and never
              moves funds. Every analysis operates on public data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const badges = [
    { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Read-only analysis" },
    { icon: <Shield className="h-3.5 w-3.5" />, label: "No private key access" },
    { icon: <Eye className="h-3.5 w-3.5" />, label: "Transparent scoring" },
    { icon: <Layers className="h-3.5 w-3.5" />, label: "Structured findings" },
    { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Explainable signals" },
    { icon: <Network className="h-3.5 w-3.5" />, label: "No custody, ever" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <SectionHeader
        eyebrow="Security & privacy"
        title="Nothing to connect. Nothing to trust blindly."
        subtitle="Oracle runs against public data and returns structured findings. There is nothing to approve, nothing to sign, and nothing to lose."
      />
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-300"
          >
            <div className="text-sky-300">{b.icon}</div>
            {b.label}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-sky-500/[0.08] via-white/[0.02] to-transparent p-10">
        <SectionHeader
          align="center"
          eyebrow="Start"
          title="Start analyzing in seconds"
          subtitle="Open the Command Center, paste a wallet, token, or NFT collection, and see Oracle reason through it."
        />
        <div className="mx-auto mt-6 max-w-lg">
          <EntitySearch large />
        </div>
      </div>
    </section>
  );
}
