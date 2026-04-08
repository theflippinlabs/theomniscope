import { Bell, Eye, FileText, Network, ShieldCheck } from "lucide-react";
import {
  OracleCard,
  OracleCardHeader,
  SectionHeader,
} from "@/components/oracle/primitives";

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
  return (
    <div className="space-y-8">
      <header>
        <SectionHeader
          eyebrow="Settings"
          title="Control how Oracle reasons and reports"
          subtitle="Every setting here is non-custodial and scoped to your session."
        />
      </header>

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
