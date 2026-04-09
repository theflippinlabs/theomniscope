import { useState } from "react";
import { Bell, CreditCard, Eye, FileText, LogOut, Network, ShieldCheck } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { startCheckout, type CheckoutPlan } from "@/lib/billing/checkout";
import { PLAN_CATALOG } from "@/lib/plans/catalog";

const SECTIONS: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; desc: string; active?: boolean }[];
}[] = [
  {
    title: "Alert preferences",
    icon: <Bell className="h-4 w-4" />,
    items: [
      { label: "Score deterioration", desc: "Trigger when a watched entity's score rises ≥ 5", active: true },
      { label: "Concentration change", desc: "Trigger on ≥ 10% shift in top-holder concentration", active: true },
      { label: "Narrative silence", desc: "Trigger when communication cadence drops ≥ 50%", active: false },
    ],
  },
  {
    title: "Data integrations",
    icon: <Network className="h-4 w-4" />,
    items: [
      { label: "On-chain enrichment", desc: "Public chain indexers. Read-only.", active: true },
      { label: "Community feed (Discord / Telegram)", desc: "Optional integration for community health agent", active: false },
      { label: "Social narrative feed", desc: "Narrative cadence, hype ratio inputs", active: true },
    ],
  },
  {
    title: "Privacy posture",
    icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      { label: "Read-only architecture", desc: "Oracle never signs transactions or accesses keys", active: true },
      { label: "Device-scoped state", desc: "Watchlists are stored in your browser until login", active: true },
      { label: "Anonymous analysis", desc: "No identifiers required to run the public demo", active: true },
    ],
  },
  {
    title: "Report defaults",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { label: "Default template", desc: "Executive Briefing", active: true },
      { label: "Include conflict notes", desc: "When agents disagree, surface the reason", active: true },
      { label: "Include next actions", desc: "Always append recommended next actions", active: true },
    ],
  },
];

export default function OracleSettings() {
  const { profile, planTier, usageToday, signOut, user } = useAuth();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [busy, setBusy] = useState<CheckoutPlan | null>(null);

  const plan = PLAN_CATALOG[planTier];
  const cap = plan.limits.dailyAnalysisCap;
  const capLabel = Number.isFinite(cap) ? String(cap) : "∞";

  async function handleUpgrade(target: CheckoutPlan) {
    setCheckoutError(null);
    setBusy(target);
    const result = await startCheckout(target);
    setBusy(null);
    if (!result.ok) setCheckoutError(result.error ?? "Checkout failed.");
  }

  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Settings"
          title="Control how Oracle reasons and reports"
          subtitle="Every setting here is non-custodial and scoped to your session."
        />
      </header>

      <OracleCard>
        <OracleCardHeader
          title="Account & billing"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <div className="grid gap-5 p-5 md:grid-cols-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Signed in as
            </div>
            <div className="mt-1 truncate text-sm text-zinc-100">
              {profile?.email ?? user?.email ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Current plan
            </div>
            <div className="mt-1 text-sm font-semibold uppercase text-sky-300">
              {plan.name}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Usage today
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums text-zinc-100">
              {usageToday} / {capLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.05] px-5 py-4">
          {planTier !== "pro" && planTier !== "elite" && (
            <Button
              onClick={() => handleUpgrade("pro")}
              disabled={busy !== null}
              className="bg-sky-500 text-zinc-950 hover:bg-sky-400"
            >
              {busy === "pro" ? "Opening checkout…" : "Upgrade to Pro"}
            </Button>
          )}
          {planTier !== "elite" && (
            <Button
              onClick={() => handleUpgrade("elite")}
              disabled={busy !== null}
              variant="outline"
              className="border-sky-500/40 text-sky-200 hover:bg-sky-500/10"
            >
              {busy === "elite" ? "Opening checkout…" : "Upgrade to Elite"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => void signOut()}
            className="ml-auto text-zinc-400 hover:text-zinc-200"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
        {checkoutError && (
          <div className="border-t border-rose-500/20 bg-rose-500/5 px-5 py-3 text-[11px] text-rose-200">
            {checkoutError}
          </div>
        )}
      </OracleCard>

      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <OracleCard key={s.title}>
            <OracleCardHeader title={s.title} icon={s.icon} />
            <ul className="divide-y divide-white/[0.03]">
              {s.items.map((i) => (
                <li
                  key={i.label}
                  className="flex items-start justify-between gap-4 px-5 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-100">
                      {i.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {i.desc}
                    </div>
                  </div>
                  <div
                    className={`mt-1 flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                      i.active
                        ? "bg-sky-500/30 justify-end"
                        : "bg-white/[0.06] justify-start"
                    }`}
                  >
                    <span
                      className={`mx-0.5 h-4 w-4 rounded-full transition ${
                        i.active ? "bg-sky-300" : "bg-zinc-500"
                      }`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </OracleCard>
        ))}
      </div>

      <OracleCard className="p-6">
        <div className="flex items-center gap-2 text-zinc-300">
          <Eye className="h-4 w-4 text-sky-300" />
          <div className="text-sm font-semibold">Session privacy note</div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Oracle's current session stores preferences in your browser only. No
          wallet connection, key, or personally identifying information is
          required to use the public surface. Connect an integration only when
          you want deeper community signal.
        </p>
      </OracleCard>
    </div>
  );
}
