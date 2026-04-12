import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronRight,
  Coins,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  Radar,
  Scan,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";

const NAV_SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: React.ReactNode; exact?: boolean }[];
}[] = [
  {
    label: "Intelligence",
    items: [
      {
        to: "/app/command",
        label: "Command Center",
        icon: <LayoutDashboard className="h-4 w-4" />,
        exact: true,
      },
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        to: "/app/wallet",
        label: "Wallet Analyzer",
        icon: <Wallet className="h-4 w-4" />,
      },
      {
        to: "/app/token",
        label: "Token Analyzer",
        icon: <Coins className="h-4 w-4" />,
      },
      {
        to: "/app/nft",
        label: "NFT Monitoring",
        icon: <ImageIcon className="h-4 w-4" />,
      },
      {
        to: "/app/forensic",
        label: "Forensic Mode",
        icon: <Scan className="h-4 w-4" />,
      },
      {
        to: "/app/signals",
        label: "Signals",
        icon: <Radar className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        to: "/app/investigations",
        label: "Investigations",
        icon: <Search className="h-4 w-4" />,
      },
      {
        to: "/app/reports",
        label: "Reports",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        to: "/app/alerts",
        label: "Alerts & Watchlists",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        to: "/app/history",
        label: "Oracle History",
        icon: <ListChecks className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Trust",
    items: [
      {
        to: "/methodology",
        label: "Methodology",
        icon: <BookOpen className="h-4 w-4" />,
      },
      {
        to: "/security",
        label: "Security",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        to: "/app/settings",
        label: "Settings",
        icon: <SettingsIcon className="h-4 w-4" />,
      },
    ],
  },
];

/**
 * Shell used across all authenticated Oracle Sentinel pages. Dark
 * obsidian surface with a chrome sidebar and a compact top bar.
 */
export function OracleAppShell() {
  const { pathname } = useLocation();
  return (
    <div className="relative min-h-screen bg-[#05060a] text-zinc-100 antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_70%_-10%,rgba(56,189,248,0.08),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-black/30 lg:flex">
          <div className="flex h-16 items-center border-b border-white/[0.05] px-5">
            <Link to="/" className="flex items-center gap-3">
              <BrandMark size={30} withWordmark />
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-6">
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-400 transition",
                          isActive
                            ? "border border-white/[0.08] bg-white/[0.06] text-zinc-100 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]"
                            : "border border-transparent hover:bg-white/[0.03] hover:text-zinc-100",
                        )
                      }
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-white/[0.05] p-3">
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                <Brain className="h-3 w-3 text-sky-400" />
                Command Brain
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                9 agents · all nominal
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#05060a]/80 px-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Link to="/" className="flex items-center">
                  <BrandMark size={28} />
                </Link>
              </div>
              <Breadcrumbs pathname={pathname} />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-zinc-400 md:flex">
                <Activity className="h-3 w-3 text-emerald-400" />
                Live feed streaming
              </div>
              <Link
                to="/app/alerts"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.06]"
              >
                <AlertTriangle className="h-3 w-3" />
                3 alerts
              </Link>
            </div>
          </header>

          <main className="flex-1 px-5 pb-24 pt-6 md:px-8">
            <Outlet />
          </main>

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/[0.06] bg-[#05060a]/90 py-2 backdrop-blur-xl lg:hidden">
            {[
              { to: "/app/command", icon: <LayoutDashboard className="h-4 w-4" />, label: "Home" },
              { to: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard" },
              { to: "/app/forensic", icon: <Scan className="h-4 w-4" />, label: "Oracle" },
              { to: "/app/history", icon: <ListChecks className="h-4 w-4" />, label: "History" },
              { to: "/app/settings", icon: <SettingsIcon className="h-4 w-4" />, label: "Profile" },
            ].map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px]",
                    isActive ? "text-sky-300" : "text-zinc-500",
                  )
                }
              >
                {i.icon}
                <span>{i.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const LABELS: Record<string, string> = {
    app: "Oracle",
    command: "Command Center",
    dashboard: "Dashboard",
    forensic: "Forensic Mode",
    wallet: "Wallet Analyzer",
    token: "Token Analyzer",
    nft: "NFT Monitoring",
    signals: "Signals",
    investigations: "Investigations",
    reports: "Reports",
    alerts: "Alerts",
    history: "Oracle History",
    methodology: "Methodology",
    security: "Security",
    transparency: "Transparency",
    legal: "Legal",
    settings: "Settings",
    analyze: "Entity Analysis",
  };
  const segments = pathname.split("/").filter(Boolean);
  const trail = segments.map((s) => LABELS[s] ?? s);
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
      {trail.map((label, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className={cn(i === trail.length - 1 && "text-zinc-200")}>
            {label}
          </span>
          {i < trail.length - 1 && <span className="text-zinc-700">/</span>}
        </span>
      ))}
    </div>
  );
}
